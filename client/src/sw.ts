/// <reference lib="webworker" />
// Optimized Workbox routes for offline-friendly UX with large bundle support
// This file is built by vite-plugin-pwa

import { registerRoute, NavigationRoute } from 'workbox-routing'
import { StaleWhileRevalidate, NetworkOnly, NetworkFirst, CacheFirst } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

// Enhanced API caching with better error handling
registerRoute(
  ({ request, url }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-get',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutes
      }),
    ],
  })
)

// Cache static assets more aggressively to reduce bundle load
registerRoute(
  ({ request, url }) => {
    return request.destination === 'image' ||
           request.destination === 'font' ||
           url.pathname.match(/\.(js|css|woff|woff2|png|jpg|jpeg|gif|svg|webp|ico)$/)
  },
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      new ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
      }),
    ],
  })
)

// Queue mutations while offline and replay later with better retry logic
const bgSync = new BackgroundSyncPlugin('api-mutations', {
  maxRetentionTime: 24 * 60, // minutes
})

;(['POST', 'PUT', 'PATCH', 'DELETE'] as const).forEach((method) => {
  registerRoute(
    ({ request, url }) => request.method === method && url.pathname.startsWith('/api/'),
    new NetworkOnly({ plugins: [bgSync] }),
    method
  )
})

// Handle navigation requests with fallback
const navigationRoute = new NavigationRoute(
  new NetworkFirst({
    cacheName: 'navigations',
    networkTimeoutSeconds: 3,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
)

registerRoute(navigationRoute)

// Claim control immediately to handle large assets
declare const self: ServiceWorkerGlobalScope

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', () => {
  self.clients.claim()
})
