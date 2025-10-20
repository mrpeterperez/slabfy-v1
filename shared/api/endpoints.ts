// Centralized API endpoint constants to prevent drift / typos
// Keep naming flat + descriptive. Only include stable server routes.

export const API_ENDPOINTS = {
  SALES_REFRESH: '/api/sales-history-refresh/refresh',
  SALES_UNIVERSAL: (assetId: string) => `/api/sales-comp-universal/${assetId}`,
  PRICING_SINGLE: (assetId: string) => `/api/pricing/${assetId}`,
  PRICING_BATCH: '/api/pricing/batch',
  AUTH_SYNC: '/api/auth/sync',
  EVENTS: '/api/events',
  ASSETS_USER: (userId: string) => `/api/assets/user/${userId}`,
  ASSET: (id: string) => `/api/assets/${id}`,
};

export type EndpointKey = keyof typeof API_ENDPOINTS;
