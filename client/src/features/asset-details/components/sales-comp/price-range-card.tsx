import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';

interface PricingData {
  highestPrice: number;
  lowestPrice: number;
  averagePrice: number;
  pricingPeriod: string;
}

interface PriceRangeCardProps {
  assetId: string;
}

export function PriceRangeCard({ assetId }: PriceRangeCardProps) {
  const { data: pricingData, isLoading } = useQuery<PricingData>({
    queryKey: ['pricing', assetId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/pricing/${assetId}`);
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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
          <CardTitle className="text-sm font-medium text-muted-foreground">Price Range</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="animate-pulse space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-muted rounded w-12"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="h-3 bg-muted rounded w-12"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
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
          <CardTitle className="text-sm font-medium text-muted-foreground">Price Range</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-sm text-muted-foreground">No data</div>
        </CardContent>
      </Card>
    );
  }

  const priceSpread = pricingData.highestPrice - pricingData.lowestPrice;
  const spreadPercentage = pricingData.averagePrice > 0 
    ? ((priceSpread / pricingData.averagePrice) * 100).toFixed(0)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Price Range</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Highest Sale</span>
            <span className="text-sm font-medium text-success">
              {formatCurrency(pricingData.highestPrice)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Lowest Sale</span>
            <span className="text-sm font-medium text-destructive">
              {formatCurrency(pricingData.lowestPrice)}
            </span>
          </div>
        </div>
        
        <div className="pt-2 border-t border-border">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Price Spread</span>
            <span className="font-medium">
              {formatCurrency(priceSpread)} ({spreadPercentage}%)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}