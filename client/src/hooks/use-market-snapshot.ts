import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { API_ENDPOINTS } from '@shared/api/endpoints';

// Market snapshot data interface
export interface MarketSnapshot {
  assetId: string;
  averagePrice: number;
  confidence: number;
  salesCount: number;
  liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  // Optional history data if requested
  history?: MarketHistoryPoint[];
}

export interface MarketHistoryPoint {
  timestamp: string;
  price: number;
  volume: number;
}

// Hook options interface
export interface UseMarketSnapshotOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  includeHistory?: boolean;
  historyPoints?: number;
  staleTime?: number;
  refetchOnWindowFocus?: boolean;
  pendingTimeoutMs?: number;
  pollIntervalMs?: number;
}

// Default configuration constants
const DEFAULT_OPTIONS: Required<UseMarketSnapshotOptions> = {
  enabled: true,
  refetchInterval: false,
  includeHistory: false,
  historyPoints: 30,
  staleTime: 15_000, // 15 seconds
  refetchOnWindowFocus: true,
  pendingTimeoutMs: 15_000, // 15 seconds
  pollIntervalMs: 4_000, // 4 seconds
};

/**
 * Unified market snapshot hook that handles both single and batch requests
 * 
 * @param ids - Single asset ID or array of asset IDs
 * @param options - Configuration options for the hook
 * @returns Object containing market data, query state, and pending info
 */
export function useMarketSnapshot(
  ids: string | string[],
  options: UseMarketSnapshotOptions = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const assetIds = Array.isArray(ids) ? ids : [ids];
  const isMultiple = Array.isArray(ids);
  
  // Track pending state for newly added assets
  const [pending, setPending] = useState<Record<string, number>>({});
  const prevAssetIdsRef = useRef<Set<string>>(new Set());

  // Mark newly added assets as pending
  useEffect(() => {
    const prev = prevAssetIdsRef.current;
    const next = new Set<string>();
    const now = Date.now();
    const updates: Record<string, number> = {};

    assetIds.forEach(id => {
      next.add(id);
      if (!prev.has(id)) {
        updates[id] = now;
      }
    });

    if (Object.keys(updates).length) {
      setPending(p => ({ ...p, ...updates }));
    }

    prevAssetIdsRef.current = next;
  }, [assetIds]);

  // Generate normalized cache key
  const cacheKey = useMemo(() => {
    if (isMultiple) {
      // For batch requests, sort IDs for stable cache key
      const sortedIds = [...assetIds].sort().join(',');
      return ['/api/market', { ids: sortedIds, includeHistory: config.includeHistory }];
    } else {
      // For single requests
      return ['/api/market', assetIds[0], { includeHistory: config.includeHistory }];
    }
  }, [assetIds, isMultiple, config.includeHistory]);

  // Main query for market data
  const marketQuery = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!assetIds.length) return [];

      try {
        let response: Response;
        
        if (isMultiple) {
          // Batch request for multiple assets
          response = await apiRequest('POST', API_ENDPOINTS.PRICING_BATCH, {
            globalAssetIds: assetIds.sort(), // Sort for consistency
            includeHistory: config.includeHistory,
            historyPoints: config.historyPoints,
          });
        } else {
          // Single asset request
          const endpoint = config.includeHistory
            ? `${API_ENDPOINTS.PRICING_SINGLE(assetIds[0])}?includeHistory=true&historyPoints=${config.historyPoints}`
            : API_ENDPOINTS.PRICING_SINGLE(assetIds[0]);
          response = await apiRequest('GET', endpoint);
        }

        const payload = await response.json();

        // Normalize response format
        if (isMultiple) {
          // Batch response: object keyed by asset ID
          const snapshots: MarketSnapshot[] = [];
          
          for (const assetId of assetIds) {
            const data = payload[assetId];
            if (data) {
              snapshots.push({
                assetId,
                averagePrice: data.averagePrice || 0,
                confidence: data.confidence || 0,
                salesCount: data.salesCount || 0,
                liquidity: data.liquidity || 'cold',
                ...(config.includeHistory && data.history ? { history: data.history } : {}),
              });
            } else {
              // Provide default values for missing data
              snapshots.push({
                assetId,
                averagePrice: 0,
                confidence: 0,
                salesCount: 0,
                liquidity: 'cold',
                ...(config.includeHistory ? { history: [] } : {}),
              });
            }
          }
          
          return snapshots;
        } else {
          // Single response: direct object
          return [{
            assetId: assetIds[0],
            averagePrice: payload.averagePrice || 0,
            confidence: payload.confidence || 0,
            salesCount: payload.salesCount || 0,
            liquidity: payload.liquidity || 'cold',
            ...(config.includeHistory && payload.history ? { history: payload.history } : {}),
          }];
        }
      } catch (error) {
        console.warn('Market snapshot fetch failed:', error);
        
        // Return default values for all requested assets on error
        return assetIds.map(assetId => ({
          assetId,
          averagePrice: 0,
          confidence: 0,
          salesCount: 0,
          liquidity: 'cold' as const,
          ...(config.includeHistory ? { history: [] } : {}),
        }));
      }
    },
    enabled: config.enabled && assetIds.length > 0,
    // Poll while assets are pending, otherwise use configured interval
    refetchInterval: () => {
      const hasPending = Object.keys(pending).length > 0;
      if (hasPending) return config.pollIntervalMs;
      return config.refetchInterval;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: config.refetchOnWindowFocus,
    refetchOnMount: true,
    staleTime: config.staleTime,
    // Structural sharing helps prevent unnecessary re-renders
    structuralSharing: true,
  });

  // Convert array response to normalized object for easy lookup
  const marketData = useMemo(() => {
    const map: Record<string, MarketSnapshot> = {};
    if (marketQuery.data) {
      marketQuery.data.forEach((snapshot) => {
        map[snapshot.assetId] = snapshot;
      });
    }
    return map;
  }, [marketQuery.data]);

  // Clear pending state when real data arrives or timeout occurs
  useEffect(() => {
    if (!Object.keys(pending).length) return;

    const now = Date.now();
    const updated = { ...pending };
    let changed = false;

    for (const assetId of Object.keys(pending)) {
      const snapshot = marketData[assetId];
      const timedOut = now - pending[assetId] > config.pendingTimeoutMs;
      const hasRealData = snapshot && 
        ((snapshot.averagePrice ?? 0) > 0 || (snapshot.salesCount ?? 0) > 0);

      if (hasRealData || timedOut) {
        delete updated[assetId];
        changed = true;
      }
    }

    if (changed) {
      setPending(updated);
    }
  }, [marketData, pending, config.pendingTimeoutMs]);

  // Helper functions for accessing data
  const getSnapshot = (assetId: string): MarketSnapshot | undefined => {
    return marketData[assetId];
  };

  const getAllSnapshots = (): MarketSnapshot[] => {
    return assetIds.map(id => marketData[id]).filter(Boolean);
  };

  const isPending = (assetId: string): boolean => {
    return assetId in pending;
  };

  const hasPendingAssets = (): boolean => {
    return Object.keys(pending).length > 0;
  };

  // Return data and helpers
  return {
    // Core data
    marketData,
    snapshots: marketQuery.data || [],
    
    // Query state
    isLoading: marketQuery.isLoading,
    isError: marketQuery.isError,
    error: marketQuery.error,
    isSuccess: marketQuery.isSuccess,
    isFetching: marketQuery.isFetching,
    
    // Pending state
    pending,
    isPending,
    hasPendingAssets: hasPendingAssets(),
    
    // Helper functions
    getSnapshot,
    getAllSnapshots,
    
    // Query object for advanced usage
    query: marketQuery,
    
    // Refetch function
    refetch: marketQuery.refetch,
  } as const;
}

// Convenience hooks for common usage patterns

/**
 * Hook for fetching a single asset's market snapshot
 */
export function useSingleMarketSnapshot(
  assetId: string,
  options?: UseMarketSnapshotOptions
) {
  const result = useMarketSnapshot(assetId, options);
  
  return {
    ...result,
    snapshot: result.getSnapshot(assetId),
    isPending: result.isPending(assetId),
  };
}

/**
 * Hook for fetching multiple assets' market snapshots with batch optimization
 */
export function useBatchMarketSnapshot(
  assetIds: string[],
  options?: UseMarketSnapshotOptions
) {
  return useMarketSnapshot(assetIds, options);
}

// Types are already exported above with interface declarations