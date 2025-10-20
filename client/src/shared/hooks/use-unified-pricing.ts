// 🤖 INTERNAL NOTE:
// Purpose: Unified pricing hook that provides instant feedback for all features
// Exports: useUnifiedPricing hook, UnifiedPricingData interface
// Feature: shared
// Dependencies: @tanstack/react-query, @/lib/queryClient

import { useEffect, useRef, useState, useCallback } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface UnifiedPricingData {
  averagePrice: number;
  confidence: number;
  liquidity: string;
  salesCount: number;
  isLoading?: boolean;
  hasData?: boolean;
}

interface PricingTracker {
  attempts: number;
  timeoutId?: number;
  lastFetch?: number;
}

// Configuration
const BATCH_THRESHOLD = 10; // Use batch API for >10 assets
const MAX_RETRIES = 5;
const INITIAL_DELAY = 400; // ms
const BACKOFF_FACTOR = 1.5;
const POLL_INTERVAL = 4000; // ms for pending assets
const PENDING_TIMEOUT = 120000; // 2 minutes max wait

/**
 * Unified pricing hook that provides instant feedback
 * - For 1-10 assets: Individual requests for instant row-by-row updates
 * - For 11+ assets: Batch API with progressive updates
 * - Smart retry logic with exponential backoff
 * - Consistent behavior across portfolio, buying desk, and consignments
 */
export function useUnifiedPricing(
  assets: Array<{ id: string; globalAssetId?: string | null }>,
  options?: { 
    enabled?: boolean;
    onPriceUpdate?: (assetId: string, data: UnifiedPricingData) => void;
  }
) {
  const [data, setData] = useState<Record<string, UnifiedPricingData>>({});
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const trackersRef = useRef<Record<string, PricingTracker>>({});
  const abortRef = useRef(false);
  const pollIntervalRef = useRef<number>();

  // Get the canonical ID for an asset (prefer globalAssetId)
  const getAssetId = useCallback((asset: { id: string; globalAssetId?: string | null }) => {
    return asset.globalAssetId || asset.id;
  }, []);

  // Fetch pricing for a single asset with retries
  const fetchSingleAsset = useCallback(async (assetId: string) => {
    if (abortRef.current) return;
    
    const tracker = trackersRef.current[assetId];
    if (!tracker) return;

    try {
      const res = await apiRequest('GET', `/api/market?ids=${assetId}`);
      const json = await res.json();
      const apiData = json[assetId]; // Extract data for this asset from unified response
      
      const pricingData: UnifiedPricingData = {
        averagePrice: apiData?.averagePrice || 0,
        confidence: apiData?.confidence || 0,
        liquidity: apiData?.liquidity || 'cold',
        salesCount: apiData?.salesCount || 0,
        isLoading: false,
        hasData: (apiData?.averagePrice || 0) > 0 || (apiData?.salesCount || 0) > 0,
      };

      // Update state immediately for instant feedback
      setData(prev => ({ ...prev, [assetId]: pricingData }));
      options?.onPriceUpdate?.(assetId, pricingData);

      // If still no data and we have retries, schedule retry
      if (!pricingData.hasData && tracker.attempts < MAX_RETRIES && !abortRef.current) {
        const delay = Math.round(INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, tracker.attempts));
        tracker.attempts += 1;
        tracker.timeoutId = window.setTimeout(() => fetchSingleAsset(assetId), delay);
      } else {
        // Remove from pending if we have data or exhausted retries
        setPending(prev => {
          const next = new Set(prev);
          next.delete(assetId);
          return next;
        });
      }
    } catch (error) {
      // Retry on error
      if (tracker.attempts < MAX_RETRIES && !abortRef.current) {
        const delay = Math.round(INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, tracker.attempts));
        tracker.attempts += 1;
        tracker.timeoutId = window.setTimeout(() => fetchSingleAsset(assetId), delay);
      } else {
        // Final failure - set empty data
        const emptyData: UnifiedPricingData = {
          averagePrice: 0,
          confidence: 0,
          liquidity: 'cold',
          salesCount: 0,
          isLoading: false,
          hasData: false,
        };
        setData(prev => ({ ...prev, [assetId]: emptyData }));
        setPending(prev => {
          const next = new Set(prev);
          next.delete(assetId);
          return next;
        });
      }
    }
  }, [options]);

  // Fetch pricing for multiple assets in batch
  const fetchBatchAssets = useCallback(async (assetIds: string[]) => {
    if (abortRef.current || !assetIds.length) return;

    try {
      const idsQuery = assetIds.join(',');
      const res = await apiRequest('GET', `/api/market?ids=${idsQuery}`);
      const payload = await res.json();

      // Process batch results and update state incrementally
      const updates: Record<string, UnifiedPricingData> = {};
      const stillPending = new Set<string>();

      for (const assetId of assetIds) {
        const apiData = payload[assetId];
        if (apiData) {
          const pricingData: UnifiedPricingData = {
            averagePrice: apiData.averagePrice || 0,
            confidence: apiData.confidence || 0,
            liquidity: apiData.liquidity || 'cold',
            salesCount: apiData.salesCount || 0,
            isLoading: false,
            hasData: (apiData.averagePrice || 0) > 0 || (apiData.salesCount || 0) > 0,
          };
          updates[assetId] = pricingData;
          
          // If still no data, keep in pending for retry
          if (!pricingData.hasData) {
            const tracker = trackersRef.current[assetId];
            if (tracker && tracker.attempts < MAX_RETRIES) {
              tracker.attempts += 1;
              stillPending.add(assetId);
            }
          }
        } else {
          // No data returned for this asset, keep pending
          const tracker = trackersRef.current[assetId];
          if (tracker && tracker.attempts < MAX_RETRIES) {
            tracker.attempts += 1;
            stillPending.add(assetId);
          }
        }
      }

      // Update state with all results at once
      setData(prev => ({ ...prev, ...updates }));
      
      // Notify about updates
      if (options?.onPriceUpdate) {
        Object.entries(updates).forEach(([id, pricing]) => {
          options.onPriceUpdate!(id, pricing);
        });
      }

      setPending(stillPending);
    } catch (error) {
      // On batch failure, fall back to individual requests
      console.warn('Batch pricing failed, falling back to individual requests:', error);
      assetIds.forEach(id => fetchSingleAsset(id));
    }
  }, [fetchSingleAsset, options]);

  // Main effect to fetch pricing
  useEffect(() => {
    if (options?.enabled === false) return;
    
    abortRef.current = false;
    const assetIds = assets.map(getAssetId);
    
    // Clear trackers and setup new ones
    Object.values(trackersRef.current).forEach(t => {
      if (t.timeoutId) window.clearTimeout(t.timeoutId);
    });
    trackersRef.current = {};
    
    // Initialize trackers and optimistic data
    const initialPending = new Set<string>();
    const initialData: Record<string, UnifiedPricingData> = {};
    
    assetIds.forEach(id => {
      trackersRef.current[id] = { attempts: 0 };
      initialPending.add(id);
      
      // Set optimistic loading state for instant UI feedback
      if (!data[id]) {
        initialData[id] = {
          averagePrice: 0,
          confidence: 0,
          liquidity: 'cold',
          salesCount: 0,
          isLoading: true,
          hasData: false,
        };
      }
    });
    
    setData(prev => ({ ...prev, ...initialData }));
    setPending(initialPending);
    setLoading(true);

    // Decide strategy based on asset count
    if (assetIds.length <= BATCH_THRESHOLD) {
      // Small batch: individual requests for instant feedback
      assetIds.forEach(id => fetchSingleAsset(id));
    } else {
      // Large batch: use batch API
      fetchBatchAssets(assetIds);
    }

    // Set up polling for pending assets
    pollIntervalRef.current = window.setInterval(() => {
      if (pending.size > 0 && !abortRef.current) {
        const pendingIds = Array.from(pending);
        if (pendingIds.length <= BATCH_THRESHOLD) {
          pendingIds.forEach(id => fetchSingleAsset(id));
        } else {
          fetchBatchAssets(pendingIds);
        }
      }
    }, POLL_INTERVAL);

    // Cleanup
    return () => {
      abortRef.current = true;
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
      Object.values(trackersRef.current).forEach(t => {
        if (t.timeoutId) window.clearTimeout(t.timeoutId);
      });
    };
  }, [assets.map(getAssetId).sort().join(','), options?.enabled]);

  // Update loading state when all assets have data or timed out
  useEffect(() => {
    const allDone = pending.size === 0;
    if (allDone && loading) {
      setLoading(false);
    }
  }, [pending.size, loading]);

  // Timeout pending assets after PENDING_TIMEOUT
  useEffect(() => {
    if (pending.size === 0) return;
    
    const timeoutId = window.setTimeout(() => {
      setPending(new Set());
      setLoading(false);
    }, PENDING_TIMEOUT);
    
    return () => window.clearTimeout(timeoutId);
  }, [pending.size]);

  return {
    pricing: data,
    loading,
    pending: pending.size > 0,
    refetch: useCallback(() => {
      const assetIds = assets.map(getAssetId);
      if (assetIds.length <= BATCH_THRESHOLD) {
        assetIds.forEach(id => fetchSingleAsset(id));
      } else {
        fetchBatchAssets(assetIds);
      }
    }, [assets, getAssetId, fetchSingleAsset, fetchBatchAssets]),
  };
}

export default useUnifiedPricing;