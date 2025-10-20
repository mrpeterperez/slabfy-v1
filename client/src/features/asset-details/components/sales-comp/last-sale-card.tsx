import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SalesData {
  sales_history?: Array<{
    finalPrice?: number;
    totalPrice?: number;
    saleDate?: string;
    soldDate?: string;
    sold_date?: { date?: { raw?: string } } | string;
    sold_price?: { value?: number | string };
    price?: { value?: number | string };
    shipping?: number | string;
  }>;
}

interface LastSaleCardProps {
  assetId: string;
}

export function LastSaleCard({ assetId }: LastSaleCardProps) {
  const { data: salesData, isLoading } = useQuery<SalesData>({
    queryKey: ['/api/sales-comp-universal', assetId],
    queryFn: async () => {
      const response = await fetch(`/api/sales/sales-comp-universal/${assetId}`);
      if (!response.ok) throw new Error('Failed to fetch sales data');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    
    try {
      let cleanDate = dateStr;
      if (dateStr.includes('T')) {
        cleanDate = dateStr.split('T')[0];
      }
      
      const [year, month, day] = cleanDate.split('-');
      return `${month}/${day}/${year}`;
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Last Sale</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="animate-pulse">
            <div className="h-7 bg-muted rounded w-16 mb-2"></div>
            <div className="h-3 bg-muted rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const salesHistory = salesData?.sales_history || [];
  const lastSale = salesHistory[0]; // Already sorted newest first

  if (!lastSale) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Last Sale</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="text-lg font-bold mb-1">--</div>
          <div className="text-xs text-muted-foreground">No sales data</div>
        </CardContent>
      </Card>
    );
  }

  // Handle different price field formats from API
  const salePrice = parseFloat(String(lastSale.sold_price?.value || lastSale.finalPrice || lastSale.price?.value || lastSale.totalPrice || 0));
  const shippingCost = parseFloat(String(lastSale.shipping || 0));
  const lastSalePrice = salePrice + shippingCost;
  
  const lastSaleDate = typeof lastSale.sold_date === 'object' 
    ? lastSale.sold_date?.date?.raw 
    : lastSale.sold_date || lastSale.soldDate || lastSale.saleDate;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">Last Sale</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-2xl font-bold mb-1">
          {formatCurrency(lastSalePrice)}
        </div>
        <div className="text-xs text-muted-foreground">
          {formatDate(lastSaleDate || '')}
        </div>
      </CardContent>
    </Card>
  );
}