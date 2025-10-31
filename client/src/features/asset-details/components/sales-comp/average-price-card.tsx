import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfidenceIndicator } from './confidence-indicator';
import { PRICING_CACHE } from '@/lib/cache-tiers';
import { queryKeys } from '@/lib/query-keys';

interface PricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  confidence: number;
  salesCount: number;
  pricingPeriod: string;
}

interface AveragePriceCardProps {
  assetId: string;
}

export function AveragePriceCard({ assetId }: AveragePriceCardProps) {
  const { data: pricingData, isLoading, isFetching } = useQuery<PricingData>({
    queryKey: queryKeys.pricing.single(assetId),
    queryFn: async () => {
      const response = await fetch(`/api/pricing/${assetId}`);
      if (!response.ok) throw new Error('Failed to fetch pricing data');
      return response.json();
    },
    placeholderData: (previousData) => previousData,
    ...PRICING_CACHE,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Sale Price</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="animate-pulse">
            <div className="h-7 bg-muted rounded w-20 mb-3"></div>
            <div className="flex justify-between items-center mb-2">
              <div className="h-3 bg-muted rounded w-12"></div>
              <div className="h-3 bg-muted rounded w-8"></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3 bg-muted rounded w-12"></div>
              <div className="h-3 bg-muted rounded w-8"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!pricingData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Sale Price</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-bold mb-1">--</div>
          <div className="text-xs text-muted-foreground">No data</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
          Average Sale Price
          <ConfidenceIndicator 
            confidence={pricingData.confidence} 
            salesCount={pricingData.salesCount}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="text-2xl font-bold">
          {formatCurrency(pricingData.averagePrice)}
        </div>
        
        <div className="text-xs text-muted-foreground">
          Last 30 Days
        </div>
      </CardContent>
    </Card>
  );
}