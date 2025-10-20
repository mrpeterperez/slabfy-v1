import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useEffect, useRef } from 'react';

interface SparklineDataPoint { date: string; price: number; timestamp: number; }
interface SparklineResult { data: SparklineDataPoint[]; isUsingAllTime: boolean; triedFallback?: boolean; }

interface UseSparklineOptions { fallbackAssetId?: string; }

// Poll schedule (ms) – stops early if we get any data
const POLL_DELAYS = [3000, 6000, 10000, 15000];

export const useSparklineData = (assetId: string, opts: UseSparklineOptions = {}) => {
  const { fallbackAssetId } = opts;
  const queryClient = useQueryClient();
  const pollIndexRef = useRef(0);
  const doneRef = useRef(false);

  const query = useQuery<SparklineResult>({
    queryKey: [`sparkline-data-${assetId}`, fallbackAssetId],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/sales/sales-comp-universal/${assetId}`);
        const data = await response.json();
        const salesHistory = (data?.sales_history || data?.sales || data || []) as any[];
        if (!Array.isArray(salesHistory) || salesHistory.length === 0) {
          // If no data and fallback provided (and different), attempt fallback once inline
          if (fallbackAssetId && fallbackAssetId !== assetId) {
            try {
              const resp2 = await apiRequest('GET', `/api/sales/sales-comp-universal/${fallbackAssetId}`);
              const data2 = await resp2.json();
              const sales2 = (data2?.sales_history || data2?.sales || data2 || []) as any[];
              if (Array.isArray(sales2) && sales2.length) {
                return buildResult(sales2, true);
              }
            } catch { /* swallow */ }
          }
          return { data: [], isUsingAllTime: false, triedFallback: !!fallbackAssetId };
        }
        return buildResult(salesHistory, false);
      } catch {
        return { data: [], isUsingAllTime: false, triedFallback: !!fallbackAssetId };
      }
    },
    enabled: !!assetId,
    staleTime: 120000,
    gcTime: 900000,
    retry: 1,
  });

  // Helper to transform sales array into sparkline result
  function buildResult(salesHistory: any[], triedFallback: boolean): SparklineResult {
    const toNum = (v: any): number => {
          if (v == null) return 0;
          if (typeof v === 'number') return v;
          if (typeof v === 'string') {
            const cleaned = v.replace(/[^0-9+\-.,]/g, '').replace(/,/g, '');
            const n = parseFloat(cleaned);
            return isNaN(n) ? 0 : n;
          }
          if (typeof v === 'object' && 'value' in v) return toNum((v as any).value);
          return 0;
        };
    const getDate = (sale: any): Date | null => {
          const candidate = sale?.sold_date?.date?.raw || sale?.sold_date || sale?.soldDate || sale?.dateSold || sale?.date;
          if (!candidate) return null;
          const d = new Date(candidate);
          return isNaN(d.getTime()) ? null : d;
        };
    const getTotalPrice = (sale: any): number => {
          const finalPrice = toNum(sale?.final_price);
          const shipping = toNum(sale?.shipping) || 0;
          if (finalPrice > 0) return finalPrice + shipping;
          const base = toNum(sale?.sold_price?.value) || toNum(sale?.sold_price) || toNum(sale?.price?.value) || 0;
          return base + shipping;
        };
    const allPoints: SparklineDataPoint[] = salesHistory
          .map((sale) => {
            const d = getDate(sale);
            if (!d) return null;
            const total = getTotalPrice(sale);
            if (total <= 0) return null;
            return { date: d.toISOString().split('T')[0], price: Math.round(total * 100) / 100, timestamp: d.getTime() } as SparklineDataPoint;
          })
          .filter((p): p is SparklineDataPoint => Boolean(p))
          .sort((a: any, b: any) => a.timestamp - b.timestamp);
    const now = new Date();
    const thirtyAgo = new Date(now.getTime() - 30*24*60*60*1000);
    const recent = allPoints.filter(p => p.timestamp > thirtyAgo.getTime() && p.timestamp <= now.getTime());
    const finalPoints = recent.length ? recent : allPoints;
    const isUsingAllTime = !recent.length && allPoints.length > 0;
    return { data: finalPoints, isUsingAllTime, triedFallback };
  }

  // Polling logic - only while we have zero data
  useEffect(() => {
    if (!assetId) return;
    if (doneRef.current) return;
    if (query.data && query.data.data.length > 0) { doneRef.current = true; return; }
    if (pollIndexRef.current >= POLL_DELAYS.length) return; // exhausted
    const delay = POLL_DELAYS[pollIndexRef.current++];
    const t = window.setTimeout(() => {
      if (doneRef.current) return;
      queryClient.invalidateQueries({ queryKey: [`sparkline-data-${assetId}`, fallbackAssetId] });
    }, delay);
    return () => window.clearTimeout(t);
  }, [assetId, query.data, queryClient, fallbackAssetId]);

  return query;
};
