import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PRICING_CACHE } from '@/lib/cache-tiers';
import { queryKeys } from '@/lib/query-keys';

interface RealTimePricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: string;
  confidence: number; // 0-100 percentage
  salesCount: number;
  lastSaleDate: string;
  pricingPeriod: string; // "30 days" or "All time"
  thirtyDaySalesCount: number; // Number of sales in 30-day period
}

interface CardSalesAvgProps {
  assetId: string;
}

const CardSalesAvg: React.FC<CardSalesAvgProps> = ({ assetId }) => {
  // 🔥 PRODUCTION QUALITY: Type-safe keys + tiered cache + stale-while-revalidate
  const { data: pricingData, isLoading, isFetching, error } = useQuery<RealTimePricingData>({
    queryKey: queryKeys.pricing.single(assetId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/pricing/${assetId}`);
      return response.json();
    },
    placeholderData: (previousData) => previousData,
    ...PRICING_CACHE,
  });



  // Currency formatter
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Loading skeleton
  if (isLoading) {
    return (
  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-skeleton rounded w-1/2 mb-2"></div>
          <div className="h-6 bg-skeleton rounded w-2/3 mb-3"></div>
          <div className="h-3 bg-skeleton rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !pricingData) {
    return (
  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
  <div className="text-muted-foreground text-sm font-medium mb-1">Average Sale Price</div>
  <div className="text-2xl font-bold text-muted-foreground">--</div>
  <div className="text-xs text-muted-foreground mt-1">No pricing data</div>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="pb-4 border-b border-border">
        <div className="text-muted-foreground text-sm font-medium mb-1">Average Sale Price</div>
        <div className="text-3xl font-bold text-foreground">
          {formatCurrency(pricingData.averagePrice)}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Based on {pricingData.pricingPeriod || '30 days'}
        </div>
      </div>
      
      <div className="py-3 border-b border-border flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Highest Sale ({pricingData.pricingPeriod || '30 days'})</div>
  <div className="font-semibold text-success">
          {formatCurrency(pricingData.highestPrice)}
        </div>
      </div>
      
      <div className="py-3 flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Lowest Sale ({pricingData.pricingPeriod || '30 days'})</div>
  <div className="font-semibold text-destructive">
          {formatCurrency(pricingData.lowestPrice)}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Based on {pricingData.salesCount} recent sales
        </div>
      </div>
    </div>
  );
};

// Export as PriceCard for consistency
export const PriceCard = CardSalesAvg;
export default CardSalesAvg;