// 🤖 INTERNAL NOTE:
// Purpose: Table cell components for events list display
// Exports: InventoryCountCell, SessionStatsCell, PurchasedCountCell, SoldCountCell, RevenueCell, PurchasedCell
// Feature: events
// Dependencies: @/features/events/hooks/use-events, @tanstack/react-query

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useEventInventoryCount, useEventSessionStats, useEventsPurchaseCounts } from "@/features/events/hooks/use-events";

// Small helper cell to show per-event inventory count
export function InventoryCountCell({ id }: { id: string }) {
  const { data, isLoading, error } = useEventInventoryCount(id);
  if (isLoading) return <span className="text-muted-foreground">—</span>;
  if (error) {
    console.error(`Inventory count error for event ${id}:`, error);
    return <span className="text-muted-foreground">—</span>;
  }
  const count = typeof data === 'number' ? data : 0;
  return <span className="font-medium text-secondary">{count}</span>;
}

// Helper cell for session count
export function SessionStatsCell({ id }: { id: string }) {
  const { data, isLoading } = useEventSessionStats(id);
  if (isLoading) return <span className="text-muted-foreground">—</span>;
  return <span className="font-medium text-secondary">{data?.totalSessions ?? 0}</span>;
}

// Helper cell for purchased count  
export function PurchasedCountCell({ id }: { id: string }) {
  const { data: purchaseCounts, isLoading, error } = useEventsPurchaseCounts();
  if (isLoading) return <span className="text-muted-foreground">—</span>;
  if (error) {
    console.error(`Purchase counts error:`, error);
    return <span className="text-muted-foreground">—</span>;
  }
  const count = purchaseCounts?.[id] ?? 0;
  return <span className="font-medium text-secondary">{count}</span>;
}

// Helper cell for sold count - shows actual sales transactions, not buying sessions
export function SoldCountCell({ id }: { id: string }) {
  const { data: sales, isLoading } = useQuery({
    queryKey: ["eventSales", id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/events/${id}/sales`);
      return res.json();
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
  
  if (isLoading) return <span className="text-muted-foreground">—</span>;
  const count = Array.isArray(sales) ? sales.length : 0;
  return <span className="font-medium text-secondary">{count}</span>;
}

// Helper cell for revenue display - shows actual revenue from sales transactions  
export function RevenueCell({ event }: { event: any }) {
  // Prefer precomputed stats; if missing/zero, fetch quick fallback from sales endpoint
  const soldCount = event.soldCount ?? 0;
  const revenue = event.revenue ?? 0;
  const needFallback = soldCount === 0 && revenue === 0;

  const { data: fallback, isLoading: loadingFallback } = useQuery({
    queryKey: ["eventRevenue", event.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/events/${event.id}/sales`);
      const sales = await res.json();
      const count = Array.isArray(sales) ? sales.length : 0;
      const total = Array.isArray(sales) ? sales.reduce((s: number, it: any) => s + Number(it.salePrice || 0), 0) : 0;
      return { count, total };
    },
    enabled: needFallback && !!event?.id,
    staleTime: 30_000,
  });

  const finalCount = needFallback ? (fallback?.count ?? 0) : soldCount;
  const finalRevenue = needFallback ? (fallback?.total ?? 0) : revenue;

  if (loadingFallback) return <span className="text-muted-foreground">—</span>;
  if (finalCount === 0) return <span className="text-muted-foreground">—</span>;
  
  const fmtCurrency = new Intl.NumberFormat(undefined, { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return (
    <span className="font-medium text-success">
      Qty {finalCount} | +{fmtCurrency.format(finalRevenue)}
    </span>
  );
}

// Helper cell for purchased display - shows purchased count and total spent
export function PurchasedCell({ event }: { event: any }) {
  // Prefer precomputed stats; if zero, fallback to purchases endpoint (fast aggregate in client)
  const purchasedCount = event.purchasedCount ?? 0;
  const purchasedTotal = event.purchasedTotal ?? 0;
  const needFallback = purchasedCount === 0 && purchasedTotal === 0;

  const { data: fallback, isLoading: loadingFallback } = useQuery({
    queryKey: ["eventPurchases", event.id],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/events/${event.id}/purchases`);
      const purchases = await res.json();
      const count = Array.isArray(purchases) ? purchases.length : 0;
      const total = Array.isArray(purchases) ? purchases.reduce((s: number, it: any) => s + Number(it.purchasePrice || 0), 0) : 0;
      return { count, total };
    },
    enabled: needFallback && !!event?.id,
    staleTime: 30_000,
  });

  const finalCount = needFallback ? (fallback?.count ?? 0) : purchasedCount;
  const finalTotal = needFallback ? (fallback?.total ?? 0) : purchasedTotal;

  if (loadingFallback) return <span className="text-muted-foreground">—</span>;
  if (finalCount === 0) return <span className="text-muted-foreground">—</span>;
  
  const fmtCurrency = new Intl.NumberFormat(undefined, { 
    style: "currency", 
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return (
    <span className="font-medium text-muted-foreground">
      Qty {finalCount} | -{fmtCurrency.format(finalTotal)}
    </span>
  );
}