// 🤖 INTERNAL NOTE:
// Purpose: Mobile list view using card layout for portfolio assets
// Exports: MobilePortfolioList component
// Feature: my-portfolio-v0
// Dependencies: react, mobile-portfolio-card, use-simple-pricing, grouping-utils

import React, { useMemo } from 'react';
import type { Asset } from '@shared/schema';
import { MobilePortfolioCard } from './mobile-portfolio-card';
import { useSimplePricing } from '../hooks/use-simple-pricing';
import { buildGroupKey } from './grouped-table/grouping-utils';

interface MobilePortfolioListProps {
  assets: Asset[];
  onViewAsset?: (asset: Asset) => void;
}

export function MobilePortfolioList({ assets, onViewAsset }: MobilePortfolioListProps) {
  const { pricing } = useSimplePricing(assets);

  // Group assets by card identity
  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const a of assets) {
      const key = buildGroupKey(a) || `__single__:${a.id}`;
      const bucket = map.get(key);
      if (bucket) bucket.push(a); else map.set(key, [a]);
    }
    
    // Sort each group so assets with PSA images come first
    const groups = Array.from(map.values());
    groups.forEach(group => {
      group.sort((a, b) => {
        const aHasImage = !!(a.psaImageFrontUrl && a.psaImageFrontUrl.trim());
        const bHasImage = !!(b.psaImageFrontUrl && b.psaImageFrontUrl.trim());
        if (aHasImage && !bHasImage) return -1;
        if (!aHasImage && bHasImage) return 1;
        return 0;
      });
    });
    
    return groups.map(group => ({
      key: buildGroupKey(group[0]),
      group
    }));
  }, [assets]);

  const handleClick = (asset: Asset) => {
    if (onViewAsset) {
      onViewAsset(asset);
    } else {
      window.location.href = `/assets/${asset.id}`;
    }
  };

  return (
    <div className="lg:hidden flex flex-col">
      {grouped.map(({ key, group }, index) => {
        const representative = group[0];
        return (
          <MobilePortfolioCard
            key={key}
            asset={representative}
            market={pricing[representative.globalAssetId || representative.id]}
            index={index}
            onClick={handleClick}
            groupCount={group.length}
          />
        );
      })}
    </div>
  );
}
