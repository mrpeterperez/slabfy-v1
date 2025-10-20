// ultra-minimal pricing fetcher for v0: per-asset direct hits with retries + incremental state updates
// Strategy:
// 1. For each asset immediately fire GET /api/pricing/:id (preferring globalAssetId)
// 2. If result averagePrice === 0 & salesCount === 0, retry up to MAX_RETRIES (backoff)
// 3. Each successful fetch merges into state so UI updates row-by-row (no refresh needed)
// 4. Abort all in-flight + clear timers on dependency change/unmount

import { useEffect, useRef, useState } from 'react';

export interface SimplePricingRow {
  averagePrice: number;
  confidence: number;
  liquidity: string;
  salesCount: number;
}

interface InternalTracker {
  attempts: number;
  timeoutId?: number;
  aborted: boolean;
}

const MAX_RETRIES = 5;           // hard cap
const INITIAL_DELAY = 400;       // first retry delay ms
const BACKOFF_FACTOR = 1.5;      // multiplicative backoff

export function useSimplePricing(assets: { id: string; globalAssetId?: string | null }[]) {
  const [data, setData] = useState<Record<string, SimplePricingRow>>({});
  const [loading, setLoading] = useState(false);
  const trackerRef = useRef<Record<string, InternalTracker>>({});
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    // Reset trackers
    trackerRef.current = {};
    // Clear previous data for removed assets while keeping existing for stable ones
    const next: Record<string, SimplePricingRow> = {};
    const ids = assets.map(a => a.globalAssetId || a.id);
    for (const id of ids) {
      if (data[id]) next[id] = data[id];
    }
    setData(next);
    if (!assets.length) return;
    setLoading(true);

  const fetchOne = async (id: string) => {
      if (abortRef.current) return;
      try {
        const res = await fetch(`/api/pricing/${id}`);
        if (!res.ok) throw new Error('http ' + res.status);
        const json = await res.json();
        const row: SimplePricingRow = {
          averagePrice: json.averagePrice || 0,
            confidence: json.confidence || 0,
            liquidity: json.liquidity || 'cold',
            salesCount: json.salesCount || 0,
        };
        setData(prev => (prev[id] && prev[id].averagePrice === row.averagePrice && prev[id].salesCount === row.salesCount)
          ? prev // no change
          : { ...prev, [id]: row });

        // If still zero data and we have retries left, schedule retry
        const t = trackerRef.current[id];
        if (t && (row.averagePrice === 0 && row.salesCount === 0) && t.attempts < MAX_RETRIES && !abortRef.current) {
          const delay = Math.round(INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, t.attempts));
          t.attempts += 1;
          t.timeoutId = window.setTimeout(() => fetchOne(id), delay);
        }
      } catch (e) {
        const t = trackerRef.current[id];
        if (t && t.attempts < MAX_RETRIES && !abortRef.current) {
          const delay = Math.round(INITIAL_DELAY * Math.pow(BACKOFF_FACTOR, t.attempts));
          t.attempts += 1;
          t.timeoutId = window.setTimeout(() => fetchOne(id), delay);
        } else {
          // final failure -> ensure placeholder exists
          setData(prev => prev[id] ? prev : { ...prev, [id]: { averagePrice: 0, confidence: 0, liquidity: 'cold', salesCount: 0 } });
        }
      }
    };

    // Kick off all assets in parallel (prefer globalAssetId for canonical pricing lookups)
    for (const asset of assets) {
      const id = asset.globalAssetId || asset.id;
      trackerRef.current[id] = { attempts: 0, aborted: false };
      if (!data[id]) {
        // optimistic placeholder so row renders stable
        setData(prev => prev[id] ? prev : { ...prev, [id]: { averagePrice: 0, confidence: 0, liquidity: 'cold', salesCount: 0 } });
      }
      fetchOne(id);
    }

    // When ALL trackers either have non-zero or exhausted attempts, loading ends.
    // Simple polling to detect completion.
  const monitor = window.setInterval(() => {
      if (abortRef.current) { window.clearInterval(monitor); return; }
      const idsPending = Object.keys(trackerRef.current).filter(id => {
        const t = trackerRef.current[id];
        const row = data[id];
        const done = (row && (row.averagePrice > 0 || row.salesCount > 0)) || (t.attempts >= MAX_RETRIES);
        return !done;
      });
      if (!idsPending.length) {
        setLoading(false);
        window.clearInterval(monitor);
      }
    }, 300);

    return () => {
      // Abort + clear timers
      abortRef.current = true;
      for (const id of Object.keys(trackerRef.current)) {
        const t = trackerRef.current[id];
        if (t.timeoutId) window.clearTimeout(t.timeoutId);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets.map(a => a.globalAssetId || a.id).sort().join(',')]);

  return { pricing: data, loading } as const;
}

export default useSimplePricing;