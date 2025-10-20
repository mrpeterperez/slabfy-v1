/**
 * Centralized cache invalidation system for real-time pricing updates
 * 
 * This utility provides functions to invalidate both client-side (React Query) 
 * and server-side caches when pricing data changes, ensuring all views 
 * throughout the app reflect updated pricing immediately.
 */

import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';

// ===== ID RESOLUTION =====
// Helper to resolve asset ID to globalAssetId when available
// This fixes the critical ID mismatch issue where callers pass asset.id but server expects globalAssetId

/**
 * Resolve asset identifier to global asset ID
 * Handles both Asset objects and plain strings
 */
function resolveAssetIds(assetOrIds: string | {id?: string, globalAssetId?: string} | Array<string | {id?: string, globalAssetId?: string}>): string[] {
  if (typeof assetOrIds === 'string') {
    return [assetOrIds];
  }
  if (Array.isArray(assetOrIds)) {
    return assetOrIds.map(item => {
      if (typeof item === 'string') return item;
      return item.globalAssetId || item.id || '';
    }).filter(Boolean);
  }
  // Single object case
  return [assetOrIds.globalAssetId || assetOrIds.id || ''].filter(Boolean);
}

/**
 * Get multiple ID formats for comprehensive cache invalidation
 * Returns both the original ID and globalAssetId if different
 */
function getIdVariations(assetOrIds: string | {id?: string, globalAssetId?: string} | Array<string | {id?: string, globalAssetId?: string}>): string[] {
  if (typeof assetOrIds === 'string') {
    return [assetOrIds];
  }
  if (Array.isArray(assetOrIds)) {
    const variations = new Set<string>();
    assetOrIds.forEach(item => {
      if (typeof item === 'string') {
        variations.add(item);
      } else {
        if (item.id) variations.add(item.id);
        if (item.globalAssetId) variations.add(item.globalAssetId);
      }
    });
    return Array.from(variations).filter(Boolean);
  }
  // Single object case
  const single = new Set<string>();
  if (assetOrIds.id) single.add(assetOrIds.id);
  if (assetOrIds.globalAssetId) single.add(assetOrIds.globalAssetId);
  return Array.from(single);
}

// ===== CACHE KEY PATTERNS =====
// These patterns match the cache keys used throughout the app
const CACHE_KEY_PATTERNS = {
  // Market data (unified endpoint)
  MARKET_SINGLE: (assetId: string) => ['/api/market', assetId],
  MARKET_BATCH: () => ['/api/market'],
  
  // Legacy pricing endpoints - both string template and array formats
  PRICING_SINGLE: (assetId: string) => ['/api/pricing', assetId],
  PRICING_SINGLE_STRING: (assetId: string) => [`/api/pricing/${assetId}`],
  PRICING_SIMPLE: (assetId: string) => ['pricing', assetId],
  PRICING_BATCH: () => ['/api/pricing'],
  
  // Portfolio pricing v2 - CRITICAL missing pattern
  PORTFOLIO_PRICING_V2_SINGLE: (assetId: string) => ['portfolio-pricing-v2', assetId],
  PORTFOLIO_PRICING_V2_BATCH: () => ['portfolio-pricing-v2'],
  
  // Sparkline data - CRITICAL missing pattern
  SPARKLINE_DATA: (assetId: string) => [`sparkline-data-${assetId}`],
  
  // Sales data - multiple formats used throughout app
  SALES_COMP_UNIVERSAL: (assetId: string) => ['/api/sales-comp-universal', assetId],
  SALES_COMP_STRING: (assetId: string) => [`/api/sales-comp-universal/${assetId}`],
  SALES_COMP_SIMPLE: (assetId: string) => ['sales-comp-universal', assetId],
  SALES_COMP_UNIVERSAL_SIMPLE: (assetId: string) => ['universal-sales-comp', assetId],
  
  // Asset data that may contain cached pricing - updated to new endpoint format
  ASSETS_USER: (userId: string) => ['/api/user', userId, 'assets'],
  ASSETS_USER_STRING: (userId: string) => [`/api/user/${userId}/assets`],
  ASSET_SINGLE: (assetId: string) => [`/api/assets/${assetId}`],
  
  // Related assets (for asset details breakdown tables)
  ASSETS_RELATED: () => ['/api/assets/related'],
};

// ===== CLIENT-SIDE CACHE INVALIDATION =====

/**
 * Invalidate client-side cache for a single asset
 * Clears all pricing, market, and asset data related to the asset
 * Now handles both user asset IDs and globalAssetIds properly
 */
export async function invalidateAssetCache(assetOrId: string | {id?: string, globalAssetId?: string}): Promise<void> {
  const assetIds = getIdVariations(assetOrId);
  if (!assetIds.length) {
    console.warn('invalidateAssetCache: No valid asset IDs found');
    return;
  }

  console.log(`🗑️ Invalidating client cache for asset IDs:`, assetIds);

  // Create promises for all ID variations to ensure comprehensive cache clearing
  const invalidationPromises: Promise<void>[] = [];
  
  for (const assetId of assetIds) {
    invalidationPromises.push(
      // Market data (primary)
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.MARKET_SINGLE(assetId),
        exact: false 
      }),
      
      // Portfolio pricing v2 - CRITICAL missing pattern now added
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.PORTFOLIO_PRICING_V2_SINGLE(assetId),
        exact: false 
      }),
      
      // Sparkline data - CRITICAL missing pattern now added
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.SPARKLINE_DATA(assetId),
        exact: false 
      }),
      
      // Legacy pricing endpoints - all formats
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.PRICING_SINGLE(assetId),
        exact: false 
      }),
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.PRICING_SINGLE_STRING(assetId),
        exact: false 
      }),
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.PRICING_SIMPLE(assetId),
        exact: false 
      }),
      
      // Sales comparison data - all formats
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.SALES_COMP_UNIVERSAL(assetId),
        exact: false 
      }),
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.SALES_COMP_STRING(assetId),
        exact: false 
      }),
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.SALES_COMP_SIMPLE(assetId),
        exact: false 
      }),
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.SALES_COMP_UNIVERSAL_SIMPLE(assetId),
        exact: false 
      }),
      
      // Asset data (may contain cached pricing info)
      queryClient.invalidateQueries({ 
        queryKey: CACHE_KEY_PATTERNS.ASSET_SINGLE(assetId),
        exact: false 
      })
    );
  }
  
  // Add batch and general cache invalidations
  invalidationPromises.push(
    // Market data batch queries (may contain this asset)
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return queryKey.length >= 1 && 
               queryKey[0] === '/api/market' &&
               (typeof queryKey[1] === 'object' || queryKey.length > 2);
      }
    }),
    
    // Portfolio pricing v2 batch queries
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return queryKey.length >= 1 && queryKey[0] === 'portfolio-pricing-v2';
      }
    }),
    
    // Legacy pricing batch queries
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.PRICING_BATCH(),
      exact: false 
    }),
    
    // Related assets queries
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.ASSETS_RELATED(),
      exact: false 
    }),
    
    // User asset lists - use predicate to catch all user-specific queries  
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return (queryKey.length >= 2 && 
               queryKey[0] === '/api/assets/user') ||
               (queryKey.length >= 3 && 
               queryKey[0] === '/api/user' && queryKey[2] === 'assets');
      }
    })
  );

  await Promise.all(invalidationPromises);
  console.log(`✅ Client cache invalidated for asset IDs:`, assetIds);
}

/**
 * Invalidate client-side cache for multiple assets
 * More efficient than calling invalidateAssetCache for each asset individually
 * Now handles both user asset IDs and globalAssetIds properly
 */
export async function invalidateAssetsCache(assetsOrIds: string[] | Array<{id?: string, globalAssetId?: string}>): Promise<void> {
  const assetIds = getIdVariations(assetsOrIds);
  if (!assetIds.length) {
    console.warn('invalidateAssetsCache: No valid asset IDs found');
    return;
  }

  console.log(`🗑️ Invalidating client cache for ${assetIds.length} asset IDs:`, assetIds);

  // Invalidate individual asset caches - now includes CRITICAL missing patterns
  const individualInvalidations = assetIds.map(assetId => [
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.MARKET_SINGLE(assetId),
      exact: false 
    }),
    // Portfolio pricing v2 - CRITICAL missing pattern now added
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.PORTFOLIO_PRICING_V2_SINGLE(assetId),
      exact: false 
    }),
    // Sparkline data - CRITICAL missing pattern now added
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.SPARKLINE_DATA(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.PRICING_SINGLE(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.PRICING_SINGLE_STRING(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.PRICING_SIMPLE(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.SALES_COMP_UNIVERSAL(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.SALES_COMP_STRING(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.SALES_COMP_SIMPLE(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.SALES_COMP_UNIVERSAL_SIMPLE(assetId),
      exact: false 
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.ASSET_SINGLE(assetId),
      exact: false 
    }),
  ]).flat();

  // Invalidate batch and general caches
  const generalInvalidations = [
    // All market batch queries
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return queryKey.length >= 1 && 
               (queryKey[0] === '/api/market' || queryKey[0] === '/api/pricing');
      }
    }),
    
    // Portfolio pricing v2 batch queries - CRITICAL missing pattern now added
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return queryKey.length >= 1 && queryKey[0] === 'portfolio-pricing-v2';
      }
    }),
    
    // General asset caches - use predicates to catch all variations
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return (queryKey.length >= 2 && 
               queryKey[0] === '/api/assets/user') ||
               (queryKey.length >= 3 && 
               queryKey[0] === '/api/user' && queryKey[2] === 'assets');
      }
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.ASSETS_RELATED(),
      exact: false 
    }),
  ];

  await Promise.all([...individualInvalidations, ...generalInvalidations]);
  console.log(`✅ Client cache invalidated for ${assetIds.length} asset IDs`);
}

/**
 * Invalidate all pricing-related client-side cache
 * Nuclear option for when extensive pricing updates occur
 */
export async function invalidateAllPricingCache(): Promise<void> {
  console.log('🧹 Invalidating ALL pricing-related client cache');

  const invalidationPromises = [
    // All market data - comprehensive predicate to catch all pricing-related queries
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        if (!queryKey.length) return false;
        const key0 = queryKey[0].toString();
        return key0 === '/api/market' || 
               key0 === '/api/pricing' ||
               key0 === 'pricing' ||
               key0.includes('/api/pricing') ||
               key0 === 'portfolio-pricing-v2' || // CRITICAL missing pattern now added
               key0.includes('sparkline-data') || // CRITICAL missing pattern now added
               key0 === '/api/sales-comp-universal' ||
               key0 === 'sales-comp-universal' ||
               key0 === 'universal-sales-comp' ||
               key0.includes('/api/sales-comp');
      }
    }),
    
    // All asset data (may contain pricing) - handle both old and new endpoint patterns
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return (queryKey.length >= 2 && 
               queryKey[0] === '/api/assets/user') ||
               (queryKey.length >= 3 && 
               queryKey[0] === '/api/user' && queryKey[2] === 'assets');
      }
    }),
    queryClient.invalidateQueries({ 
      queryKey: CACHE_KEY_PATTERNS.ASSETS_RELATED(),
      exact: false 
    }),
  ];

  await Promise.all(invalidationPromises);
  console.log('✅ ALL pricing-related client cache invalidated');
}

// ===== SERVER-SIDE CACHE INVALIDATION =====

/**
 * Invalidate server-side cache for specific asset IDs
 * Uses the /api/market/purge endpoint
 * Now properly resolves globalAssetId for server operations
 */
export async function invalidateServerCache(assetsOrIds: string | string[] | {id?: string, globalAssetId?: string} | Array<{id?: string, globalAssetId?: string}>): Promise<void> {
  // Normalize to array for resolution
  const inputArray = Array.isArray(assetsOrIds) ? assetsOrIds : [assetsOrIds];
  // Use resolveAssetIds to prefer globalAssetId for server operations
  const resolvedIds = resolveAssetIds(inputArray as any);
  if (!resolvedIds.length) {
    console.warn('invalidateServerCache: No valid asset IDs found');
    return;
  }

  console.log(`🗑️ Invalidating server cache for resolved asset IDs:`, resolvedIds);

  try {
    await apiRequest('POST', '/api/market/purge', {
      ids: resolvedIds
    });
    console.log(`✅ Server cache invalidated for ${resolvedIds.length} assets`);
  } catch (error) {
    console.error('❌ Failed to invalidate server cache:', error);
    // Don't throw - server cache invalidation failure shouldn't break the app
  }
}

/**
 * Invalidate all server-side cache
 * Uses pattern-based clearing for complete cache reset
 */
export async function invalidateAllServerCache(): Promise<void> {
  console.log('🧹 Invalidating ALL server cache');

  try {
    await apiRequest('POST', '/api/market/purge', {
      pattern: 'market:*'
    });
    console.log('✅ ALL server cache invalidated');
  } catch (error) {
    console.error('❌ Failed to invalidate all server cache:', error);
    // Don't throw - server cache invalidation failure shouldn't break the app
  }
}

// ===== UNIFIED INVALIDATION FUNCTIONS =====

/**
 * Complete cache invalidation for a single asset
 * Clears both client and server-side caches
 * Now handles Asset objects properly with ID resolution
 */
export async function invalidateAssetPricing(assetOrId: string | {id?: string, globalAssetId?: string}): Promise<void> {
  const assetIds = getIdVariations(assetOrId);
  if (!assetIds.length) {
    console.warn('invalidateAssetPricing: No valid asset IDs found');
    return;
  }

  console.log(`🔄 Complete cache invalidation for asset:`, assetIds);

  // Run both invalidations in parallel for efficiency
  await Promise.all([
    invalidateAssetCache(assetOrId),
  invalidateServerCache(assetOrId)
  ]);

  console.log(`✅ Complete cache invalidation completed for asset IDs:`, assetIds);
}

/**
 * Complete cache invalidation for multiple assets
 * Clears both client and server-side caches
 * Now handles Asset objects properly with ID resolution
 */
export async function invalidateAssetsPricing(assetsOrIds: string[] | Array<{id?: string, globalAssetId?: string}>): Promise<void> {
  const assetIds = getIdVariations(assetsOrIds);
  if (!assetIds.length) {
    console.warn('invalidateAssetsPricing: No valid asset IDs found');
    return;
  }

  console.log(`🔄 Complete cache invalidation for ${assetIds.length} asset IDs`);

  // Run both invalidations in parallel for efficiency
  await Promise.all([
    invalidateAssetsCache(assetsOrIds),
    invalidateServerCache(assetsOrIds)
  ]);

  console.log(`✅ Complete cache invalidation completed for ${assetIds.length} asset IDs`);
}

/**
 * Complete cache invalidation for all pricing data
 * Nuclear option - clears both client and server-side caches completely
 */
export async function invalidateAllPricing(): Promise<void> {
  console.log('🔥 NUCLEAR: Complete invalidation of ALL pricing caches');

  // Run both invalidations in parallel
  await Promise.all([
    invalidateAllPricingCache(),
    invalidateAllServerCache()
  ]);

  console.log('✅ NUCLEAR: Complete invalidation of ALL pricing caches completed');
}

// ===== SPECIALIZED INVALIDATION FUNCTIONS =====

/**
 * Invalidate cache after manual pricing refresh
 * Specifically for when users manually trigger pricing updates
 * Now handles Asset objects and forces immediate refetch of ALL critical cache patterns
 */
export async function invalidateAfterManualRefresh(assetOrId: string | {id?: string, globalAssetId?: string}): Promise<void> {
  const assetIds = getIdVariations(assetOrId);
  console.log(`🔄 Cache invalidation after manual refresh for asset IDs:`, assetIds);
  
  // For manual refreshes, we want to ensure immediate UI updates
  // Invalidate and refetch immediately
  await invalidateAssetPricing(assetOrId);
  
  // Force immediate refetch of ALL critical data patterns to update UI instantly
  const refetchPromises: Promise<any>[] = [];
  
  for (const assetId of assetIds) {
    refetchPromises.push(
      queryClient.refetchQueries({ 
        queryKey: CACHE_KEY_PATTERNS.MARKET_SINGLE(assetId),
        type: 'active'
      }),
      queryClient.refetchQueries({ 
        queryKey: CACHE_KEY_PATTERNS.PRICING_SINGLE(assetId),
        type: 'active'
      }),
      // Portfolio pricing v2 - CRITICAL for immediate portfolio table updates
      queryClient.refetchQueries({ 
        queryKey: CACHE_KEY_PATTERNS.PORTFOLIO_PRICING_V2_SINGLE(assetId),
        type: 'active'
      }),
      // Sparkline data - CRITICAL for immediate chart updates
      queryClient.refetchQueries({ 
        queryKey: CACHE_KEY_PATTERNS.SPARKLINE_DATA(assetId),
        type: 'active'
      })
    );
  }
  
  await Promise.all(refetchPromises);

  console.log(`✅ Manual refresh cache invalidation completed for asset IDs:`, assetIds);
}

/**
 * Invalidate cache after background pricing updates
 * For when automated systems update pricing data
 * Now handles Asset objects properly
 */
export async function invalidateAfterBackgroundUpdate(assetsOrIds: string[] | Array<{id?: string, globalAssetId?: string}>): Promise<void> {
  const assetIds = getIdVariations(assetsOrIds);
  console.log(`🔄 Cache invalidation after background update for ${assetIds.length} asset IDs`);
  
  // For background updates, we can be less aggressive
  // Just invalidate without forcing immediate refetch
  await invalidateAssetsPricing(assetsOrIds);

  console.log(`✅ Background update cache invalidation completed for ${assetIds.length} asset IDs`);
}

/**
 * Invalidate cache after asset creation/addition
 * For when new assets are added to portfolios/consignments
 * Now handles Asset objects properly
 */
export async function invalidateAfterAssetAddition(assetsOrIds: string[] | Array<{id?: string, globalAssetId?: string}>): Promise<void> {
  const assetIds = getIdVariations(assetsOrIds);
  console.log(`🔄 Cache invalidation after asset addition for ${assetIds.length} asset IDs`);
  
  // For new assets, we want to ensure fresh data is fetched
  // Invalidate and set up polling for pending pricing
  await invalidateAssetsPricing(assetsOrIds);
  
  // Also invalidate general lists that would now include these assets
  await Promise.all([
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey as string[];
        return (queryKey.length >= 2 && 
               queryKey[0] === '/api/assets/user') ||
               (queryKey.length >= 3 && 
               queryKey[0] === '/api/user' && queryKey[2] === 'assets');
      }
    }),
  ]);

  console.log(`✅ Asset addition cache invalidation completed for ${assetIds.length} asset IDs`);
}

// All functions are exported individually above with their declarations