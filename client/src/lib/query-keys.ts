/**
 * 🔥 PRODUCTION-QUALITY QUERY KEY FACTORY
 * 
 * Centralized, type-safe query keys for the entire application.
 * Based on TkDodo's best practices: https://tkdodo.eu/blog/effective-react-query-keys
 * 
 * Benefits:
 * - Type-safe key generation
 * - Consistent format across app
 * - Easy cache invalidation
 * - Prevents typos and bugs
 * - Self-documenting
 * 
 * Usage:
 * ```typescript
 * // Instead of:
 * queryKey: ['pricing', assetId]  // ❌ Easy to mess up
 * 
 * // Use:
 * queryKey: queryKeys.pricing.single(assetId)  // ✅ Type-safe
 * ```
 */

export const queryKeys = {
  // ===== USER & AUTH =====
  user: {
    all: ['users'] as const,
    detail: (userId: string) => ['users', userId] as const,
    assets: (userId: string) => ['users', userId, 'assets'] as const,
    consignments: (userId: string) => ['users', userId, 'consignments'] as const,
    collections: (userId: string) => ['users', userId, 'collections'] as const,
    contacts: (userId: string) => ['users', userId, 'contacts'] as const,
    transactions: (userId: string) => ['users', userId, 'transactions'] as const,
  },

  // ===== PRICING (Most Important) =====
  pricing: {
    all: ['pricing'] as const,
    single: (assetId: string) => ['pricing', assetId] as const,
    batch: (assetIds: string[]) => ['pricing', 'batch', assetIds.sort().join(',')] as const,
  },

  // ===== ASSETS =====
  assets: {
    all: ['assets'] as const,
    detail: (assetId: string) => ['assets', assetId] as const,
    global: (globalAssetId: string) => ['assets', 'global', globalAssetId] as const,
    variations: (assetId: string) => ['assets', assetId, 'variations'] as const,
  },

  // ===== SALES & MARKET DATA =====
  sales: {
    all: ['sales'] as const,
    comp: (assetId: string) => ['sales', 'comp', assetId] as const,
    compUniversal: (assetId: string) => ['sales', 'comp-universal', assetId] as const,
    history: (assetId: string) => ['sales', 'history', assetId] as const,
  },

  market: {
    all: ['market'] as const,
    snapshot: (assetId: string) => ['market', 'snapshot', assetId] as const,
    batch: (assetIds: string[]) => ['market', 'batch', assetIds.sort().join(',')] as const,
  },

  sparkline: {
    data: (assetId: string, fallbackId?: string) => 
      fallbackId 
        ? (['sparkline', assetId, fallbackId] as const)
        : (['sparkline', assetId] as const),
  },

  // ===== BUYING DESK =====
  buyingDesk: {
    all: ['buying-desk'] as const,
    sessions: () => ['buying-desk', 'sessions'] as const,
    session: (sessionId: string) => ['buying-desk', 'sessions', sessionId] as const,
    assets: (sessionId: string) => ['buying-desk', 'sessions', sessionId, 'assets'] as const,
    settings: () => ['buying-desk', 'settings'] as const,
  },

  // ===== COLLECTIONS =====
  collections: {
    all: ['collections'] as const,
    summary: () => ['collections', 'summary'] as const,
    detail: (collectionId: string) => ['collections', collectionId] as const,
    assets: (collectionId: string, userId?: string) => 
      userId 
        ? (['collections', collectionId, 'assets', userId] as const)
        : (['collections', collectionId, 'assets'] as const),
  },

  // ===== CONSIGNMENTS =====
  consignments: {
    all: (archived?: boolean) => ['consignments', { archived }] as const,
    detail: (consignmentId: string) => ['consignments', consignmentId] as const,
    assets: (consignmentId: string) => ['consignments', consignmentId, 'assets'] as const,
    stats: (archived?: boolean) => ['consignments', 'stats', { archived }] as const,
    summaries: (archived?: boolean) => ['consignments', 'summaries', { archived }] as const,
  },

  // ===== CONTACTS =====
  contacts: {
    all: (archived?: boolean) => ['contacts', { archived }] as const,
    detail: (contactId: string) => ['contacts', contactId] as const,
    summary: (archived?: boolean) => ['contacts', 'summary', { archived }] as const,
  },

  // ===== EVENTS =====
  events: {
    all: ['events'] as const,
    detail: (eventId: string) => ['events', eventId] as const,
    cart: (eventId: string) => ['events', eventId, 'cart'] as const,
    inventory: (eventId: string) => ['events', eventId, 'inventory'] as const,
    transactions: (eventId: string) => ['events', eventId, 'transactions'] as const,
  },

  // ===== SALES CHANNELS =====
  storefront: {
    settings: () => ['storefront', 'settings'] as const,
    shows: () => ['storefront', 'shows'] as const,
  },

  // ===== ANALYTICS =====
  analytics: {
    transactions: () => ['analytics', 'transactions'] as const,
    summary: () => ['analytics', 'summary'] as const,
  },
} as const;

// ===== UTILITY FUNCTIONS =====

/**
 * Invalidate all queries related to an asset
 * Useful after mutations that affect multiple data types
 */
export function getAssetRelatedKeys(assetId: string) {
  return [
    queryKeys.pricing.single(assetId),
    queryKeys.assets.detail(assetId),
    queryKeys.sales.comp(assetId),
    queryKeys.sales.compUniversal(assetId),
    queryKeys.sales.history(assetId),
    queryKeys.market.snapshot(assetId),
  ];
}

/**
 * Invalidate all queries related to a user
 * Useful after logout or user data updates
 */
export function getUserRelatedKeys(userId: string) {
  return [
    queryKeys.user.detail(userId),
    queryKeys.user.assets(userId),
    queryKeys.user.consignments(userId),
    queryKeys.user.collections(userId),
    queryKeys.user.contacts(userId),
    queryKeys.user.transactions(userId),
  ];
}

/**
 * Type-safe key matcher for invalidation
 * Example: invalidateQueries({ predicate: keyMatcher(queryKeys.pricing.all) })
 */
export function keyMatcher(key: readonly unknown[]) {
  return (query: { queryKey: readonly unknown[] }) => {
    // Check if query key starts with the provided key
    return key.every((k, i) => query.queryKey[i] === k);
  };
}
