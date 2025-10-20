// Workbox configuration for handling large assets and build optimization
module.exports = {
  globDirectory: 'dist/public/',
  globPatterns: [
    '**/*.{html,json,js,css}',
    '**/*.{png,jpg,jpeg,gif,svg,webp,ico}',
    '**/*.{woff,woff2,eot,ttf,otf}'
  ],
  
  // Increase file size limit to handle large JavaScript bundles
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
  
  // Don't precache very large assets to avoid workbox errors
  globIgnores: [
    '**/node_modules/**/*',
    '**/*.map',
    '**/workbox-*.js',
    '**/sw.js'
  ],
  
  swDest: 'dist/public/sw.js',
  swSrc: 'client/src/sw.ts',
  
  // Runtime caching for better performance
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts-cache',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
        }
      }
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'images-cache',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 Days
        }
      }
    },
    {
      urlPattern: /\/api\/.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60 // 5 minutes
        }
      }
    }
  ],
  
  // Skip waiting and claim clients immediately
  skipWaiting: true,
  clientsClaim: true,
  
  // Don't fall back to cached content for navigation requests
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/_/, /\/[^/?]+\.[^/]+$/]
};