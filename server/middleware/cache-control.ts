// 🤖 INTERNAL NOTE:
// Purpose: Cache control middleware for production optimization
// Exports: cacheControl middleware
// Feature: server optimization
// Dependencies: express

import { Request, Response, NextFunction } from 'express';

// Cache duration configurations for different asset types
const CACHE_DURATIONS = {
  // Static assets with hash in filename - cache forever
  IMMUTABLE: 'public, max-age=31536000, immutable', // 1 year
  
  // Images and fonts - cache for a month
  STATIC_ASSETS: 'public, max-age=2592000', // 30 days
  
  // HTML files - always revalidate
  HTML: 'no-cache, no-store, must-revalidate',
  
  // API responses - cache based on endpoint
  API_PUBLIC: 'public, max-age=300, s-maxage=600', // 5 min client, 10 min CDN
  API_PRIVATE: 'private, no-cache',
  
  // Default for other assets
  DEFAULT: 'public, max-age=86400', // 1 day
};

export function cacheControl(req: Request, res: Response, next: NextFunction) {
  const path = req.path.toLowerCase();
  
  // Skip cache headers in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  
  // Immutable assets (with hash in filename)
  if (path.match(/\.[a-f0-9]{8,}\.(js|css)$/)) {
    res.setHeader('Cache-Control', CACHE_DURATIONS.IMMUTABLE);
  }
  // Static assets (images, fonts)
  else if (path.match(/\.(jpg|jpeg|png|gif|svg|webp|ico|woff|woff2|ttf|otf)$/)) {
    res.setHeader('Cache-Control', CACHE_DURATIONS.STATIC_ASSETS);
  }
  // HTML files
  else if (path.match(/\.html$/) || path === '/') {
    res.setHeader('Cache-Control', CACHE_DURATIONS.HTML);
  }
  // API endpoints
  else if (path.startsWith('/api/')) {
    // Public data endpoints (can be cached)
    if (path.match(/\/api\/(pricing|sales-comp|global-assets)/)) {
      res.setHeader('Cache-Control', CACHE_DURATIONS.API_PUBLIC);
    }
    // Private user data (no caching)
    else {
      res.setHeader('Cache-Control', CACHE_DURATIONS.API_PRIVATE);
    }
  }
  // Default cache policy
  else {
    res.setHeader('Cache-Control', CACHE_DURATIONS.DEFAULT);
  }
  
  // Add other performance headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  // ETag support for better caching
  res.setHeader('ETag', `"${Date.now()}"`);
  
  next();
}

// Middleware to add CDN-friendly headers
export function cdnHeaders(req: Request, res: Response, next: NextFunction) {
  // Add headers for CDN optimization
  res.setHeader('Vary', 'Accept-Encoding');
  
  // Stale-while-revalidate for better performance
  const existingCache = res.getHeader('Cache-Control');
  if (existingCache && typeof existingCache === 'string' && existingCache.includes('public')) {
    res.setHeader('Cache-Control', `${existingCache}, stale-while-revalidate=86400`);
  }
  
  next();
}