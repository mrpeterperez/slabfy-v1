/**
 * 🔥 PRODUCTION-QUALITY CACHE TIER SYSTEM
 * 
 * Different data types need different cache strategies based on update frequency.
 * Use these constants instead of hardcoding values throughout the app.
 * 
 * Benefits:
 * - Consistency across the app
 * - Easy to adjust cache behavior globally
 * - Self-documenting code
 * - Type-safe tier selection
 */

import type { UseQueryOptions } from '@tanstack/react-query';

// ===== TIER DEFINITIONS =====

/**
 * TIER 1: STATIC DATA
 * - Rarely changes (user profile, app settings, preferences)
 * - Safe to cache for extended periods
 * - Examples: User profile, theme preferences, feature flags
 */
export const TIER_1_STATIC = {
  staleTime: 30 * 60 * 1000, // 30 minutes
  gcTime: 2 * 60 * 60 * 1000, // 2 hours
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/**
 * TIER 2: SEMI-STATIC DATA
 * - Changes occasionally (pricing, collections, contacts)
 * - Updates through explicit user actions or scheduled jobs
 * - Examples: Pricing data, collections, contacts, event summaries
 */
export const TIER_2_SEMI_STATIC = {
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/**
 * TIER 3: DYNAMIC DATA
 * - Changes frequently (transactions, active sessions)
 * - Needs fresh data on mount but not obsessively
 * - Examples: Buying desk assets, consignments, transactions
 */
export const TIER_3_DYNAMIC = {
  staleTime: 1 * 60 * 1000, // 1 minute
  gcTime: 10 * 60 * 1000, // 10 minutes
  refetchOnMount: true, // Check for updates on mount
  refetchOnWindowFocus: false, // Don't spam on tab switch
  refetchOnReconnect: false,
} as const;

/**
 * TIER 4: REAL-TIME DATA
 * - Always needs fresh data (live sessions, active offers)
 * - Use sparingly - causes frequent API calls
 * - Examples: Live bidding, active session state, real-time notifications
 */
export const TIER_4_REALTIME = {
  staleTime: 0, // Always stale - refetch immediately
  gcTime: 5 * 60 * 1000, // 5 minutes
  refetchOnMount: true,
  refetchOnWindowFocus: true, // Get fresh data when user returns
  refetchOnReconnect: true,
  refetchInterval: 30000, // Poll every 30 seconds
} as const;

// ===== SPECIALIZED CONFIGURATIONS =====

/**
 * PRICING DATA (Tier 2 variant)
 * - Only changes on: (1) Asset creation, (2) Manual refresh
 * - NO automatic scheduled refresh
 * - Longer cache than standard Tier 2
 */
export const PRICING_CACHE = {
  staleTime: 15 * 60 * 1000, // 15 minutes
  gcTime: 60 * 60 * 1000, // 1 hour
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/**
 * LIST/TABLE DATA
 * - User-facing lists that change based on user actions
 * - Balance between freshness and performance
 */
export const LIST_CACHE = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 15 * 60 * 1000, // 15 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/**
 * INFINITE SCROLL DATA
 * - Paginated data that should persist across navigation
 * - Longer cache to prevent losing scroll position
 */
export const INFINITE_SCROLL_CACHE = {
  staleTime: 10 * 60 * 1000, // 10 minutes
  gcTime: 30 * 60 * 1000, // 30 minutes
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

// ===== TYPE-SAFE TIER SELECTOR =====

export type CacheTier = 'static' | 'semi-static' | 'dynamic' | 'realtime' | 'pricing' | 'list' | 'infinite-scroll';

/**
 * Get cache configuration for a specific tier
 * @param tier - The cache tier to use
 * @returns Cache configuration object
 */
export function getCacheTier(tier: CacheTier) {
  switch (tier) {
    case 'static':
      return TIER_1_STATIC;
    case 'semi-static':
      return TIER_2_SEMI_STATIC;
    case 'dynamic':
      return TIER_3_DYNAMIC;
    case 'realtime':
      return TIER_4_REALTIME;
    case 'pricing':
      return PRICING_CACHE;
    case 'list':
      return LIST_CACHE;
    case 'infinite-scroll':
      return INFINITE_SCROLL_CACHE;
  }
}

// ===== USAGE EXAMPLES =====

/**
 * Example 1: Static user profile
 * 
 * const { data } = useQuery({
 *   queryKey: ['user', userId],
 *   queryFn: fetchUser,
 *   ...TIER_1_STATIC
 * });
 */

/**
 * Example 2: Pricing data (most common)
 * 
 * const { data } = useQuery({
 *   queryKey: ['pricing', assetId],
 *   queryFn: fetchPricing,
 *   ...PRICING_CACHE
 * });
 */

/**
 * Example 3: Dynamic buying desk assets
 * 
 * const { data } = useQuery({
 *   queryKey: ['buying-desk', sessionId],
 *   queryFn: fetchSession,
 *   ...TIER_3_DYNAMIC
 * });
 */

/**
 * Example 4: Using tier selector
 * 
 * const { data } = useQuery({
 *   queryKey: ['collections', userId],
 *   queryFn: fetchCollections,
 *   ...getCacheTier('semi-static')
 * });
 */
