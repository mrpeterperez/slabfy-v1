// 🤖 INTERNAL NOTE:
// Purpose: Grid view component for portfolio v0 displaying assets as cards
// Exports: GridViewV0 component
// Feature: my-portfolio-v0
// Dependencies: react, lucide-react, @/components/ui, @shared/schema

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { AssetTypeBadge } from '@/components/ui/asset-type-badge';
import { OwnershipBadge, getOwnershipType } from '@/components/ui/ownership-badge';
import { formatCurrency, cn } from '@/lib/utils';
import { AssetSummary } from '@/components/asset/asset-summary';
import { buildGroupKey } from '../grouped-table/grouping-utils';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import type { Asset } from '@shared/schema';
import { AssetActions } from '@/features/asset-details/components/asset-actions';
import { useUnifiedPricing } from '@/shared/hooks/use-unified-pricing';

interface GridViewV0Props {
  assets: Asset[];
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  size?: 's' | 'm' | 'l';
  // Visibility map aligned with table column keys (ownership, type, price (buy), current (market))
  visible?: Partial<Record<'ownership' | 'type' | 'price' | 'current', boolean>>;
}

const GridAssetCard = ({
  asset,
  onEdit,
  onDelete,
  size = 'm',
  visible,
  groupCount = 1,
  marketValue = 0,
}: {
  asset: Asset;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  size?: 's' | 'm' | 'l';
  visible?: Partial<Record<'ownership' | 'type' | 'price' | 'current', boolean>>;
  groupCount?: number;
  marketValue?: number;
}) => {
  const purchasePrice = parseFloat(asset.purchasePrice?.toString() || '0');

  // Normalize visibility (default true when undefined)
  const showOwnership = visible?.ownership !== false;
  const showType = visible?.type !== false;
  const showBuy = visible?.price !== false;
  const showCurrent = visible?.current !== false;

  const handleAssetClick = () => {
    window.open(`/assets/${asset.id}`, '_blank');
  };

  // Using proper OwnershipBadge component instead of hardcoded Badge

  // Type badge centralized via AssetTypeBadge

  return (
    <div className={`group transition-all duration-200 ${size === 's' ? 'text-[13px]' : ''}`}>
      {/* Asset Image */}
      <div className={`aspect-[3/4] mb-2 relative ${size === 's' ? 'rounded-sm' : ''}`}>
          {groupCount > 1 && (
            <div className="absolute top-1.5 left-1.5 z-10">
              <div className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-background/85 backdrop-blur border border-border shadow-sm leading-none">
                {groupCount}×
              </div>
            </div>
          )}
          <img
            src={asset.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL}
            alt={asset.title || 'Card'}
            className="w-full h-auto object-cover rounded-lg cursor-pointer"
            onClick={handleAssetClick}
          />
          
          {/* Actions Dropdown */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <AssetActions asset={asset} />
          </div>
      </div>

      {/* Asset Details */}
      <div className={`space-y-${size === 's' ? '1.5' : '2'} px-0`}>
          <div 
            className={`cursor-pointer ${size === 'l' ? 'text-base' : 'text-sm'}`}
            onClick={handleAssetClick}
          >
            <AssetSummary
              year={asset.year as any}
              setName={asset.setName}
              playerName={asset.playerName}
              cardNumber={asset.cardNumber as any}
              grade={asset.grade as any}
              gradeCompany={(asset as any).grader || 'PSA'}
              certNumber={(asset as any).certNumber as any}
              size={size === 's' ? 'sm' : 'md'}
              className="w-full"
            />
          </div>

          {/* Badges (conditionally rendered) */}
          {(showOwnership || showType) && (
            <div className="flex gap-1 flex-wrap">
              {showOwnership && <OwnershipBadge type={getOwnershipType(asset)} />}
              {showType && <AssetTypeBadge type={asset.type || 'raw'} />}
            </div>
          )}

          {/* Pricing (conditionally rendered) */}
          {(showBuy || showCurrent) && (
            <div className={`space-y-${size === 's' ? '0.5' : '1'}`}>
              {showBuy && (
                <div className={cn(
                  'flex justify-between items-center',
                  size === 's' ? 'text-xs' : 'text-sm'
                )}>
                  <span className="text-muted-foreground">Purchase:</span>
                  <span className="font-mono">
                    {asset.ownershipStatus === 'consignment' ? '—' : 
                     (purchasePrice > 0 ? formatCurrency(purchasePrice) : '—')}
                  </span>
                </div>
              )}
              {showCurrent && (
                <div className={cn(
                  'flex justify-between items-center',
                  size === 's' ? 'text-xs' : 'text-sm'
                )}>
                  <span className="text-muted-foreground">Market:</span>
                  <span className="font-mono font-semibold">
                    {marketValue > 0 ? formatCurrency(marketValue) : '—'}
                  </span>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
};

export function GridViewV0({ assets, onEdit, onDelete, size = 'm', visible }: GridViewV0Props) {
  // Fetch unified pricing data for all assets
  const pricingData = useUnifiedPricing(assets, { enabled: true });
  
  if (assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <div className="text-lg font-medium">No assets found</div>
          <div className="text-sm mt-1">Add assets to see them here</div>
        </div>
      </div>
    );
  }

  // Group by card identity using the same logic as the grouped table
  const grouped = useMemo(() => {
    const map = new Map<string, Asset[]>();
    for (const a of assets) {
      const key = buildGroupKey(a) || `id_${a.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return Array.from(map.entries()).map(([key, group]) => ({ key, group }));
  }, [assets]);

  const layoutClass = size === 's'
    ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-3'
    : size === 'l'
      ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6'
      : 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-5';

  return (
    <div className={cn('px-2 sm:px-4 md:px-6 lg:px-8 pt-2 sm:pt-4 md:pt-6 lg:pt-8', layoutClass)}>
      {grouped.map(({ key, group }) => {
        const representative = group[0];
        const assetId = representative.globalAssetId || representative.id;
        const pricing = pricingData.pricing[assetId];
        const marketValue = pricing?.averagePrice || 0;
        
        return (
          <GridAssetCard
            key={key}
            asset={representative}
            onEdit={onEdit}
            onDelete={onDelete}
            size={size}
            visible={visible}
            groupCount={group.length}
            marketValue={marketValue}
          />
        );
      })}
    </div>
  );
}