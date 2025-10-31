import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LiquidityIndicator } from './liquidity-indicator';
import { apiRequest } from '@/lib/queryClient';
import { PRICING_CACHE } from '@/lib/cache-tiers';
import { queryKeys } from '@/lib/query-keys';

interface PricingData {
  salesCount: number;
  liquidity: string;
  thirtyDaySalesCount: number;
}

interface SalesVolumeCardProps {
  assetId: string;
}

export function SalesVolumeCard({ assetId }: SalesVolumeCardProps) {
  const { data: pricingData, isLoading, isFetching } = useQuery<PricingData>({
    queryKey: queryKeys.pricing.single(assetId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/pricing/${assetId}`);
      return response.json();
    },
    placeholderData: (previousData) => previousData,
    ...PRICING_CACHE,
  });



  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Sales in Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="animate-pulse">
            <div className="h-7 bg-muted rounded w-8 mb-2"></div>
            <div className="h-4 bg-muted rounded w-16"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pricingData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Sales in Last 30 Days</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-bold mb-1">--</div>
          <div className="text-xs text-muted-foreground">No data</div>
        </CardContent>
      </Card>
    );
  }

  const salesCount = pricingData.thirtyDaySalesCount || pricingData.salesCount || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Sales in Last 30 Days
          <LiquidityIndicator 
            liquidity={pricingData.liquidity} 
            salesCount={salesCount}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold mb-1">
          {salesCount}
        </div>
        <div className="text-xs text-muted-foreground">
          sales recorded
        </div>
      </CardContent>
    </Card>
  );
}