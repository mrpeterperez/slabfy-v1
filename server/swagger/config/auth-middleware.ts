import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

// Middleware to authenticate access to Swagger UI
export const authenticateSwaggerUI = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const apiKey = process.env.SWAGGER_DOCS_KEY;
  const queryAuth = req.query.key;
  
  // If SWAGGER_DOCS_KEY is not set, allow access
  if (!apiKey) {
    console.warn('SWAGGER_DOCS_KEY environment variable not set. API docs access is unrestricted.');
    return next();
  }
  
  // Check query parameter authentication - using timing-safe comparison to prevent timing attacks
  if (queryAuth && typeof queryAuth === 'string' && apiKey) {
    try {
      const queryAuthBuffer = Buffer.from(queryAuth, 'utf8');
      const apiKeyBuffer = Buffer.from(apiKey, 'utf8');
      // Ensure buffers are same length for timingSafeEqual
      if (queryAuthBuffer.length === apiKeyBuffer.length && timingSafeEqual(queryAuthBuffer, apiKeyBuffer)) {
        return next();
      }
    } catch (error) {
      // Continue to next auth method if comparison fails
    }
  }

  // Check header authentication - using timing-safe comparison to prevent timing attacks
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    if (token && apiKey) {
      try {
        const tokenBuffer = Buffer.from(token, 'utf8');
        const apiKeyBuffer = Buffer.from(apiKey, 'utf8');
        // Ensure buffers are same length for timingSafeEqual
        if (tokenBuffer.length === apiKeyBuffer.length && timingSafeEqual(tokenBuffer, apiKeyBuffer)) {
          return next();
        }
      } catch (error) {
        // Continue to auth failure if comparison fails
      }
    }
  }

  // If auth failed and requesting Swagger UI, show the login page
  // Allow static assets (CSS, JS) to pass through without authentication
  if ((req.path === '/api-docs' || req.path === '/api-docs/' || req.path.startsWith('/api-docs/')) && 
      !req.path.includes('.css') && !req.path.includes('.js') && !req.path.includes('.map')) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Slabfy API Documentation</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f5f5f5;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 400px;
            width: 100%;
          }
          h1 {
            color: #333;
            margin-bottom: 1rem;
            font-size: 1.5rem;
          }
          p {
            color: #666;
            margin-bottom: 1.5rem;
          }
          input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #ddd;
            border-radius: 4px;
            margin-bottom: 1rem;
            font-size: 1rem;
            box-sizing: border-box;
          }
          button {
            width: 100%;
            padding: 0.75rem;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
          }
          button:hover {
            background-color: #0056b3;
          }
          .error {
            color: #dc3545;
            margin-top: 1rem;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🔒 Slabfy API Documentation</h1>
          <p>Please enter your API key to access the documentation.</p>
          <form onsubmit="handleSubmit(event)">
            <input type="password" id="apiKey" placeholder="Enter API key" required>
            <button type="submit">Access Documentation</button>
          </form>
          <div id="error" class="error" style="display: none;">Invalid API key. Please try again.</div>
        </div>
        <script>
          function handleSubmit(event) {
            event.preventDefault();
            const apiKey = document.getElementById('apiKey').value;
            window.location.href = '/api-docs?key=' + encodeURIComponent(apiKey);
          }
          
          // Show error if redirected back due to invalid key
          if (window.location.search.includes('error=invalid')) {
            document.getElementById('error').style.display = 'block';
          }
        </script>
      </body>
      </html>
    `);
  }

  // For other requests, return 401
  return res.status(401).json({ error: 'Authentication required' });
};