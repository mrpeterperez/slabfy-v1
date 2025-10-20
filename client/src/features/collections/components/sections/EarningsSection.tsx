// 🤖 INTERNAL NOTE:
// Purpose: Earnings section for collection management page
// Exports: EarningsSection component
// Feature: collections
// Dependencies: @/components/ui, react-query

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { useCollectionAssets } from '../../hooks/use-collections';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';

interface EarningsSectionProps {
  collection: any; // TODO: proper type from schema
}

export function EarningsSection({ collection }: EarningsSectionProps) {
  // Get collection assets for value calculations
  const { data: assets = [], isLoading: assetsLoading } = useCollectionAssets(collection.id);

  // Fetch pricing data for all assets to calculate total value
  const assetPricingQueries = useQuery({
    queryKey: ['/api/pricing/collection', collection.id, assets.map((a: any) => a.globalAssetId).sort()],
    queryFn: async () => {
      if (!assets.length) return [];
      
      const pricingPromises = assets.map(async (asset: any) => {
        try {
          const response = await fetch(`/api/pricing/${asset.globalAssetId}`);
          if (!response.ok) return { globalAssetId: asset.globalAssetId, averagePrice: 0 };
          const pricing = await response.json();
          return { 
            globalAssetId: asset.globalAssetId, 
            averagePrice: pricing.averagePrice || 0 
          };
        } catch (error) {
          console.error(`Failed to fetch pricing for asset ${asset.globalAssetId}:`, error);
          return { globalAssetId: asset.globalAssetId, averagePrice: 0 };
        }
      });
      
      return Promise.all(pricingPromises);
    },
    enabled: assets.length > 0,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Calculate metrics
  const totalValue = assetPricingQueries.data?.reduce((sum: number, pricing: any) => {
    return sum + (pricing.averagePrice || 0);
  }, 0) || 0;

  const averageAssetValue = assets.length > 0 ? totalValue / assets.length : 0;

  // Mock data for now - TODO: implement real tracking
  const performanceChange = 12.5; // percentage
  const monthlyGrowth = 8.2; // percentage

  return (
    <div className="flex-1 min-w-0 w-full max-w-full">
      {/* Toolbar Header */}
      <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px] flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Earnings & Performance</h2>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Subtitle */}
        <p className="text-muted-foreground">
          Track value growth and collection performance
        </p>

      {/* Value Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {assetPricingQueries.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${totalValue.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Asset Value
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {assetPricingQueries.isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">${averageAssetValue.toLocaleString()}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Performance (30d)
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+{performanceChange}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Growth
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+{monthlyGrowth}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Value Tracking</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">Performance Chart</p>
              <p className="text-sm">
                Value tracking and performance charts coming soon...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              Activity tracking functionality coming soon...
            </p>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
