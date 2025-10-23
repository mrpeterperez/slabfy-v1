// 🤖 INTERNAL NOTE:
// Purpose: Assets section for collection management page
// Exports: AssetsSection component
// Feature: collections
// Dependencies: @/components/ui, ./collection-assets-table

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';
import { useState, Suspense } from 'react';
import { PortfolioAssetsTable } from '@/components/table/portfolio-assets-table';
import { AddAssetsDialog } from '../add-assets-dialog';
import { useCollectionAssets, useRemoveAssetFromCollection } from '../../hooks/use-collections';
import { useAuth } from '@/components/auth-provider';
import { useQuery } from '@tanstack/react-query';
import { type Asset } from '@shared/schema';
import { Skeleton } from '@/components/ui/skeleton';

interface AssetsSectionProps {
  collection: any; // TODO: proper type from schema
}

// Table loading skeleton component for better UX
function TableLoadingSkeleton() {
  return (
    <div className="p-4 space-y-4">
      {/* Table header skeleton */}
      <div className="flex items-center space-x-4 border-b pb-2">
        <Skeleton className="h-4 w-12" /> {/* checkbox */}
        <Skeleton className="h-4 w-32" /> {/* Asset */}
        <Skeleton className="h-4 w-24" /> {/* Ownership */}
        <Skeleton className="h-4 w-16" /> {/* Type */}
        <Skeleton className="h-4 w-12" /> {/* Qty */}
        <Skeleton className="h-4 w-24" /> {/* Market Value */}
        <Skeleton className="h-4 w-20" /> {/* Confidence */}
        <Skeleton className="h-4 w-20" /> {/* Liquidity */}
        <Skeleton className="h-4 w-16" /> {/* Action */}
      </div>
      {/* Table rows skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-4 py-3 border-b">
          <Skeleton className="h-4 w-4" />
          <div className="flex items-center space-x-3">
            <Skeleton className="h-12 w-12 rounded" /> {/* Image */}
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

export function AssetsSection({ collection }: AssetsSectionProps) {
  const [addAssetsOpen, setAddAssetsOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  
  // Get collection assets with aggressive caching
  const { data: assets = [], isLoading: assetsLoading } = useCollectionAssets(collection.id);
  
  // Remove asset mutation
  const removeAssetMutation = useRemoveAssetFromCollection();
  
  // Get user assets for the add dialog
  const { data: userAssets = [] } = useQuery<Asset[]>({
    queryKey: [`/api/user/${user?.id}/assets`],
    enabled: !!user?.id && !authLoading,
  });

  // Optimized pricing data fetch with better caching and parallel loading
  const assetPricingQueries = useQuery({
    queryKey: ['/api/pricing/collection', collection.id, assets.map((a: any) => a.globalAssetId).sort()],
    queryFn: async () => {
      if (!assets.length) return [] as Array<{ globalAssetId: string; averagePrice: number }>;

      try {
        const body = { globalAssetIds: assets.map((a: any) => a.globalAssetId) };
        const response = await fetch(`/api/pricing/batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) return [];
        const json = await response.json();
        // json is a map { [id]: PricingData | null }
        return Object.entries(json).map(([globalAssetId, pricing]: any) => ({
          globalAssetId,
          averagePrice: pricing?.averagePrice ?? 0,
        }));
      } catch (error) {
        console.error('Failed to fetch batch pricing:', error);
        return [];
      }
    },
    enabled: assets.length > 0,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes (increased)
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus
    refetchOnMount: false, // Don't refetch on mount if data exists
  });

  // Calculate total value
  const totalValue = assetPricingQueries.data?.reduce((sum: number, pricing: any) => {
    return sum + (pricing.averagePrice || 0);
  }, 0) || 0;

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleRemoveAsset = (globalAssetId: string) => {
    removeAssetMutation.mutate({
      collectionId: collection.id,
      globalAssetId
    });
  };

  return (
    <div className="flex-1 min-w-0 w-full max-w-full">
      {/* Toolbar Header */}
      <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px] flex items-center">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Assets</h2>
          <Button size="sm" onClick={() => setAddAssetsOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Assets
          </Button>
        </div>
      </div>

      {/* Assets Summary */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {assetsLoading ? (
            // Loading skeleton cards
            <>
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            // Actual data cards
            <>
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
                    <p className="text-2xl font-bold">{assets.length}</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Personal Assets</p>
                    <p className="text-2xl font-bold">
                      {assets.filter((asset: any) => asset.ownershipType === 'portfolio').length}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Consignment Assets</p>
                    <p className="text-2xl font-bold">
                      {assets.filter((asset: any) => asset.ownershipType === 'consignment').length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                    {assetPricingQueries.isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">
                        {totalValue > 0 ? formatCurrency(totalValue) : "-"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto min-h-0 pt-0 p-6">
        {assets.length === 0 && !assetsLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">No assets in this collection</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Add Assets" to add cards to this collection.
            </p>
            <Button onClick={() => setAddAssetsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Assets
            </Button>
          </div>
        ) : assetsLoading ? (
          // Show table skeleton while loading instead of blank screen
          <TableLoadingSkeleton />
        ) : (
          // Use the portfolio-style reusable table by default
          <Suspense fallback={<TableLoadingSkeleton />}>
            <PortfolioAssetsTable
              items={assets as any}
              isLoading={assetsLoading}
              mode="collection"
              onRemoveFromCollection={handleRemoveAsset}
            />
          </Suspense>
        )}
      </div>

      {/* Add Assets Dialog */}
      <AddAssetsDialog
        open={addAssetsOpen}
        onOpenChange={setAddAssetsOpen}
        collectionId={collection.id}
        collection={collection}
        userAssets={userAssets}
        existingAssets={assets}
      />
    </div>
  );
}
