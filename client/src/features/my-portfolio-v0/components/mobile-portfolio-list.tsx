// 🤖 INTERNAL NOTE:
// Purpose: Mobile list view using card layout for portfolio assets
// Exports: MobilePortfolioList component
// Feature: my-portfolio-v0
// Dependencies: react, mobile-portfolio-card, use-simple-pricing

import React from 'react';
import type { Asset } from '@shared/schema';
import { MobilePortfolioCard } from './mobile-portfolio-card';
import { useSimplePricing } from '../hooks/use-simple-pricing';

interface MobilePortfolioListProps {
  assets: Asset[];
  onViewAsset?: (asset: Asset) => void;
}

export function MobilePortfolioList({ assets, onViewAsset }: MobilePortfolioListProps) {
  const { pricing } = useSimplePricing(assets);

  const handleClick = (asset: Asset) => {
    if (onViewAsset) {
      onViewAsset(asset);
    } else {
      window.location.href = `/assets/${asset.id}`;
    }
  };

  return (
    <div className="lg:hidden flex flex-col">
      {assets.map((asset, index) => (
        <MobilePortfolioCard
          key={asset.id}
          asset={asset}
          market={pricing[asset.globalAssetId || asset.id]}
          index={index}
          onClick={handleClick}
        />
      ))}
    </div>
  );
}
