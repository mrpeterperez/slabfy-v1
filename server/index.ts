// Load environment variables first (critical for local development)
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // Also load .env as fallback

import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cors from "cors";
import compression from "compression";
import { validateEnvironment } from "./validateEnv";
import { cacheControl, cdnHeaders } from "./middleware/cache-control";
import crypto from "crypto";

// 🔒 Extend Express Request interface for security tracking
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

const app = express();

// Trust proxy for rate limiting to work correctly
app.set('trust proxy', true);

// Security configuration
const isProduction = process.env.NODE_ENV === 'production';

// 🔒 Request ID tracking middleware (for security audit logging)
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// CORS configuration - More permissive for development
const corsOptions: cors.CorsOptions = {
  origin: isProduction 
    ? [
        'https://www.slabfy.com',
        'https://slabfy.com',
        'https://staging.slabfy.com'
      ]
    : function (origin, callback) {
        // In development, allow all origins
        callback(null, true);
      },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Accept-Version',
    'Content-Length',
    'Content-MD5',
    'Date',
    'X-Api-Version',
    'X-File-Name'
  ],
  exposedHeaders: ['X-Api-Version', 'X-Request-Id', 'X-Response-Time'],
  optionsSuccessStatus: 200,
  preflightContinue: false
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly for development
if (!isProduction) {
  app.options('*', cors(corsOptions));
}

// Enable compression for all responses (critical for production scalability)
app.use(compression({
  filter: (req: Request, res: Response) => {
    // Compress everything except images (already compressed)
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Balance between compression ratio and CPU usage
}));

// Cache control for production optimization
if (isProduction) {
  app.use(cacheControl);
  app.use(cdnHeaders);
}

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: isProduction
    ? {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: [
            "'self'",
            "https://api.supabase.io",
            "https://*.supabase.co",
            "wss://*.supabase.co",
          ],
          workerSrc: ["'self'", "blob:"],
          manifestSrc: ["'self'"],
        },
      }
    : false, // Disable CSP in development to avoid blocking issues
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting configuration
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs (increased from 100 for complex dashboard)
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { trustProxy: false }, // Fix for Railway/Cloudflare proxy setup
  handler: (req, res) => {
    log(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many requests from this IP, please try again after 15 minutes.'
    });
  }
});

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs (increased from 5 to allow legitimate retries)
  skipSuccessfulRequests: true, // Don't count successful requests
  message: 'Too many authentication attempts, please try again later.',
  validate: { trustProxy: false }, // Fix for Railway/Cloudflare proxy setup
  handler: (req, res) => {
    log(`Auth rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'Too many authentication attempts, please try again later.'
    });
  }
});

// Apply rate limiting
app.use('/api/', generalLimiter); // ✅ Now enabled for ALL environments for security
// Apply stricter auth rate limiting to sensitive endpoints
app.use('/api/auth/', authLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

// Use standard body parser limits since we're now using multipart/form-data for file uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Validate environment variables on startup
  validateEnvironment();
  
  await registerRoutes(app);
  
  const server = createServer(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    
    // In production, don't expose error details
    const message = isProduction 
      ? status >= 500 
        ? "An error occurred processing your request" 
        : err.message 
      : err.message || "Internal Server Error";

    // Log error details server-side
    if (status >= 500) {
      console.error('Server Error:', {
        status,
        message: err.message,
        stack: isProduction ? undefined : err.stack,
        timestamp: new Date().toISOString()
      });
    }

    res.status(status).json({ 
      error: message,
      status,
      ...(isProduction ? {} : { stack: err.stack })
    });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on port 3001 (or PORT env var)
  // this serves both the API and the client
  const port = process.env.PORT || 3001;
  
  // Try to start the server
  try {
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: false, // Disable reusePort to get a clearer error
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (err: any) {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();
