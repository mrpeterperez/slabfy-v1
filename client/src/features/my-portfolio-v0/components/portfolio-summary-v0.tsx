// 🤖 INTERNAL NOTE:
// Purpose: Portfolio summary using the original UI (value + two counts) and market snapshot totals
// Exports: PortfolioSummaryV0 component
// Feature: my-portfolio-v0
// Dependencies: filters provider, assets provider, useBatchMarketSnapshot, market-key utils

import { useEffect, useMemo, useState } from 'react';
import { User, Handshake, DollarSign } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useAssetsV0 } from './data/asset-provider-v0';
import { useFiltersV0 } from './filters/filter-provider-v0';
import { useBatchMarketSnapshot } from '@/hooks/use-market-snapshot';
import { getMarketKey, getMarketData } from '@/lib/utils/market-key';

interface PortfolioSummaryV0Props {
  userId: string;
  inline?: boolean; // when true, render lightweight inline layout (no Card)
  title?: string; // custom heading
  prefix?: React.ReactNode; // element before title (e.g., collapse button)
}

// Module flag to avoid re-animating on internal route swaps
let hasAnimatedV0 = false;

export function PortfolioSummaryV0({ userId, inline = false, title = 'My Portfolio', prefix }: PortfolioSummaryV0Props) {
  const { assets, isLoading: assetsLoading } = useAssetsV0();
  const { filterAssets } = useFiltersV0();

  // Apply current filters (same as old behavior)
  const filteredAssets = useMemo(() => filterAssets(assets), [filterAssets, assets]);

  // Pull latest pricing totals using the shared market snapshot
  const assetIds = useMemo(() => filteredAssets.map(a => getMarketKey(a)), [filteredAssets]);
  const { marketData } = useBatchMarketSnapshot(assetIds);

  const mainValue = useMemo(() => {
    if (!filteredAssets?.length) return 0;
    return filteredAssets.reduce((sum, a) => sum + (getMarketData(marketData, a)?.averagePrice || 0), 0);
  }, [filteredAssets, marketData]);

  // Counts
  const ownedCount = useMemo(() => filteredAssets.filter(a => (a as any).ownershipStatus === 'own').length, [filteredAssets]);
  const consignCount = useMemo(() => filteredAssets.filter(a => (a as any).ownershipStatus === 'consignment').length, [filteredAssets]);

  // Animation guard
  const [animateOnMount, setAnimateOnMount] = useState(false);
  useEffect(() => {
    if (!hasAnimatedV0) {
      setAnimateOnMount(true);
      hasAnimatedV0 = true;
    }
  }, []);

  if (assetsLoading) {
    if (inline) {
      return (
        <div className="flex flex-col">
          <Skeleton className="h-8 w-40 mb-2" />
          <Skeleton className="h-14 w-56 mb-4" />
          <div className="flex gap-10">
            <div className="flex items-center gap-2"><Skeleton className="h-5 w-5" /><Skeleton className="h-5 w-12" /></div>
            <div className="flex items-center gap-2"><Skeleton className="h-5 w-5" /><Skeleton className="h-5 w-12" /></div>
          </div>
        </div>
      );
    }
    return (
      <Card className="w-full mb-6">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Skeleton className="h-8 w-32 mx-auto" />
            <Skeleton className="h-12 w-48 mx-auto" />
            <div className="flex justify-center space-x-8">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-12" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (inline) {
    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl lg:text-md font-regular text-muted-foreground">{title}</h1>
          {prefix}
        </div>
        <div className="mt-1 flex items-center flex-wrap gap-4 text-muted-foreground">
          <AnimatedCounter 
            value={mainValue} 
            className="text-[34px] lg:text-2xl font-semibold font-heading text-foreground"
            duration={2000}
            showToggle={true}
            hiddenText="••••••"
            animateOnMount={animateOnMount}
          />
          <div className="w-px h-6 bg-border" aria-hidden="true" />
          <div className="flex items-center gap-1">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium leading-none">{ownedCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Handshake className="h-4 w-4" />
            <span className="text-sm font-medium leading-none">{consignCount.toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full mb-6">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold text-muted-foreground">My Portfolio</h1>
          <div className="flex items-center justify-center">
            <AnimatedCounter 
              value={mainValue} 
              className="text-4xl font-bold tracking-tight"
              duration={2000}
              showToggle={true}
              hiddenText="••••••"
              animateOnMount={animateOnMount}
            />
          </div>
          <div className="flex justify-center space-x-8 pt-2">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <User className="h-5 w-5" />
              <span className="font-medium">{ownedCount.toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Handshake className="h-5 w-5" />
              <span className="font-medium">{consignCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}