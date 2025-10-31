import React, { memo } from 'react';
import type { Asset } from '@shared/schema';
import { ConfidenceIndicator } from '@/components/ui/metrics/confidence-indicator';
import { LiquidityIndicator } from '@/components/ui/metrics/liquidity-indicator';
import { OwnershipBadge, getOwnershipType } from '@/components/ui/ownership-badge';
import { PortfolioSparkline } from '@/components/ui/metrics/sparkline';
import { formatCurrency } from '@/lib/utils';
import { AssetTypeBadge } from '@/components/ui/asset-type-badge';
import { AssetSummary } from '@/components/asset/asset-summary';
import { PLACEHOLDER_IMAGE_URL } from '@/lib/constants';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { AssetActions } from '@/features/asset-details/components/asset-actions';
import { NoMarketData } from '@/components/empty-states';

interface RowProps {
  asset: Asset;
  market?: { averagePrice: number; confidence: number; salesCount: number; liquidity: string };
  show: Record<string, boolean>;
  onClick: (asset: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  indent?: number;
}

export const GroupedTableRow = memo<RowProps>(function GroupedTableRow({ asset, market, show, onClick, onEdit, onDelete, indent = 0 }) {
  const averagePrice = market?.averagePrice || 0;
  const salesCount = market?.salesCount || 0;
  const confidence = market?.confidence || 0;
  const liquidity = market?.liquidity || 'cold';
  const buyPrice = asset.purchasePrice != null ? Number(asset.purchasePrice) : null;
  const hasMarket = (salesCount > 0) || (averagePrice > 0);
  const unrealized = hasMarket && buyPrice && buyPrice > 0 ? averagePrice - buyPrice : null;
  const unrealizedPct = hasMarket && buyPrice && buyPrice > 0 ? ((averagePrice - buyPrice) / buyPrice) * 100 : null;

  return (
    <TooltipProvider delayDuration={100}>
      <tr className="hover:bg-muted/30">
        <td className="px-3 py-3">
          <button
            type="button"
            className="flex items-center gap-3 w-full text-left group focus:outline-none"
            onClick={() => onClick(asset)}
          >
            {indent > 0 && <span style={{ width: indent }} className="flex-shrink-0" />}
            <div className={`h-auto flex-shrink-0 bg-muted rounded overflow-hidden flex items-center justify-center group-hover:ring-2 group-hover:ring-primary relative ${indent > 0 ? 'w-12' : 'w-14'}`}>
              <img src={asset.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL} alt="card" className="w-full h-full object-cover" />
              {!asset.psaImageFrontUrl && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute bottom-1 right-1 h-3 w-3 bg-muted-foreground/80 rounded-full flex items-center justify-center cursor-help">
                      <span className="text-[8px] text-background font-bold">?</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">No image available from PSA</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <div className="leading-tight max-w-[22ch]">
              <AssetSummary
                year={asset.year as any}
                setName={asset.setName}
                playerName={asset.playerName}
                cardNumber={asset.cardNumber as any}
                grade={asset.grade as any}
                gradeCompany={(asset as any).grader || 'PSA'}
                certNumber={(asset as any).certNumber as any}
                size="md"
              />
            </div>
          </button>
        </td>
        {show.ownership && (
          <td className="px-3 py-3 text-right align-middle">
            <div className="flex items-center justify-end gap-2">
              <OwnershipBadge
                type={getOwnershipType(asset)}
                interactive
                onClick={(e) => {
                  e.stopPropagation();
                  if (getOwnershipType(asset) === 'consignment' && (asset as any).consignmentId) {
                    window.open(`/consignments/${(asset as any).consignmentId}`, '_blank');
                  }
                }}
              />
            </div>
          </td>
        )}
        {show.type && <td className="px-3 py-3 text-right align-middle"><AssetTypeBadge type={(asset as any).type} /></td>}
        {show.qty && <td className="px-3 py-3 text-right align-middle">1</td>}
        {show.price && <td className="px-3 py-3 text-right align-middle">{asset.ownershipStatus === 'consignment' ? '—' : (buyPrice != null ? formatCurrency(buyPrice) : '—')}</td>}
        {show.unrealized && (
          <td className="px-3 py-3 text-right align-middle">{!hasMarket || unrealized == null ? <NoMarketData /> : (
            <div>
              <div className={unrealized >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {unrealized >= 0 ? '+' : ''}{formatCurrency(unrealized)}
              </div>
              {unrealizedPct != null && <div className={unrealized >= 0 ? 'text-green-600 text-[11px]' : 'text-red-600 text-[11px]'}>{unrealized >= 0 ? '+' : ''}{unrealizedPct.toFixed(1)}%</div>}
            </div>
          )}</td>
        )}
        {show.confidence && <td className="px-3 py-3 text-center align-middle">{hasMarket ? <ConfidenceIndicator value={confidence} /> : <NoMarketData />}</td>}
        {show.liquidity && <td className="px-3 py-3 text-center align-middle">{hasMarket ? <LiquidityIndicator value={liquidity} showExitTime={false} /> : <NoMarketData />}</td>}
        {show.current && (
          <td className="px-3 py-3 text-right align-middle font-medium sticky right-24 bg-background z-0">
            {hasMarket ? (
              <>
                <div>{formatCurrency(market?.averagePrice || 0)}</div>
                <div className="text-[11px] text-muted-foreground">{market?.salesCount || 0} comps</div>
              </>
            ) : (
              <NoMarketData />)
            }
          </td>
        )}
        {show.trend && (
          <td className="px-3 py-3 text-center align-middle sticky right-0 bg-background z-0">
            <div className="flex items-center justify-end gap-2">
              <div className="w-28 flex items-center justify-center">
                {hasMarket ? (
                  <PortfolioSparkline assetId={asset.globalAssetId || asset.id} />
                ) : (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="px-2 py-1 text-[11px] rounded-full bg-muted text-muted-foreground border border-border cursor-help">
                        No market data
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>No market activity found</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              {/* Unified 3-dot actions menu */}
              <AssetActions asset={asset} />
            </div>
          </td>
        )}
      </tr>
    </TooltipProvider>
  );
});
