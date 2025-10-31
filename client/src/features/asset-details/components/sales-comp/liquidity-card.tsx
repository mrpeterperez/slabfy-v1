import React from 'react';
import { useQuery } from '@tanstack/react-query';
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

interface CardLiquidityRatingProps {
  assetId: string;
}

const CardLiquidityRating: React.FC<CardLiquidityRatingProps> = ({ assetId }) => {
  // 🔥 PRODUCTION QUALITY: Type-safe keys + tiered cache + stale-while-revalidate
  const { data: pricingData, isLoading, isFetching, error } = useQuery<RealTimePricingData>({
    queryKey: queryKeys.pricing.single(assetId),
    queryFn: async () => {
      const response = await fetch(`/api/pricing/${assetId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pricing data');
      }
      return response.json();
    },
    placeholderData: (previousData) => previousData,
    ...PRICING_CACHE,
  });

  // Liquidity display helpers
  const getLiquidityDisplay = (rating: string, salesCount: number = 0) => {
    const normalizedRating = (rating || '').toLowerCase();
    
    const getColor = (status: string) => {
      switch (status) {
        case 'fire': return 'text-destructive';
        case 'hot': return 'text-warning';
        case 'warm': return 'text-brand';
        case 'cool': return 'text-muted-foreground';
        case 'cold': return 'text-muted-foreground';
        default: return 'text-muted-foreground';
      }
    };

    const getEmoji = (status: string) => {
      switch (status) {
        case 'fire': return '🔥';
        case 'hot': return '⚡';
        case 'warm': return '💧';
        case 'cool': return '❄️';
        case 'cold': return '🧊';
        default: return '❓';
      }
    };

    const getPercentage = (status: string, salesCount: number) => {
      // Calculate percentage based on actual trading activity
      // Use a logarithmic scale for better representation of liquidity
      const basePercentage = Math.min(90, Math.max(5, Math.log10(salesCount + 1) * 30));
      
      let percentage = 0;
      switch (status) {
        case 'fire': percentage = Math.max(75, basePercentage); break; // 50+ sales
        case 'hot': percentage = Math.max(55, Math.min(74, basePercentage)); break; // 30-49 sales
        case 'warm': percentage = Math.max(35, Math.min(54, basePercentage)); break; // 15-29 sales
        case 'cool': percentage = Math.max(15, Math.min(34, basePercentage)); break; // 5-14 sales
        case 'cold': percentage = Math.max(5, Math.min(14, basePercentage)); break; // 1-4 sales
        default: percentage = 0;
      }
      
      // Round to whole number for clean display
      return Math.round(percentage);
    };

    const getDescription = (status: string, salesCount: number) => {
      if (salesCount === 0) return 'No trading activity';
      if (salesCount === 1) return 'Very limited trading';
      if (salesCount <= 3) return 'Low trading activity';
      if (salesCount <= 8) return 'Moderate trading activity';
      if (salesCount <= 20) return 'Active trading';
      return 'High trading activity';
    };

    return {
      rating: normalizedRating.toUpperCase(),
      color: getColor(normalizedRating),
      emoji: getEmoji(normalizedRating),
      percentage: getPercentage(normalizedRating, salesCount || 0),
      description: getDescription(normalizedRating, salesCount || 0)
    };
  };

  // Loading skeleton
  if (isLoading) {
    return (
  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
        <div className="animate-pulse">
          <div className="h-4 bg-skeleton rounded w-1/2 mb-2"></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 bg-skeleton rounded"></div>
            <div className="h-5 bg-skeleton rounded w-16"></div>
          </div>
          <div className="h-3 bg-skeleton rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !pricingData) {
    return (
  <div className="bg-card p-4 rounded-lg border border-border shadow-sm">
  <div className="text-muted-foreground text-sm font-medium mb-1">Market Liquidity</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xl">--</span>
          <div className="text-lg font-bold text-muted-foreground">--</div>
        </div>
  <div className="text-xs text-muted-foreground">No liquidity data</div>
      </div>
    );
  }

  const liquidityDisplay = getLiquidityDisplay(pricingData.liquidity, pricingData.salesCount);

  return (
    <div className="bg-card p-6 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="pb-4 border-b border-border">
        <div className="text-muted-foreground text-sm font-medium mb-4">Market Liquidity</div>
        
        <div className="flex flex-col items-center">
          <div className="relative w-20 h-20 mb-4">
            {/* Circular Progress */}
            <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 36 36">
              <path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="2"
              />
              <path
                d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray={`${liquidityDisplay.percentage}, 100`}
                className={liquidityDisplay.color}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{liquidityDisplay.percentage}%</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{liquidityDisplay.emoji}</span>
            <div className={`text-lg font-bold ${liquidityDisplay.color}`}>
              {liquidityDisplay.rating}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground text-center">
            {liquidityDisplay.description}
          </div>
        </div>
      </div>
      
      <div className="py-3 flex justify-between items-center">
        <div className="text-muted-foreground text-sm">Sales in 30 days</div>
  <div className="font-semibold text-brand">{pricingData.salesCount} sales</div>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          Rating based on sales frequency and price stability
        </div>
      </div>
    </div>
  );
};

// Export as LiquidityCard for consistency
export const LiquidityCard = CardLiquidityRating;
export default CardLiquidityRating;