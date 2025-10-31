import React, { useState, useMemo } from 'react';
import type { Asset } from '@shared/schema';
import { ChevronRight, ChevronDown, MoreHorizontal, Eye, Edit2, Trash2 } from 'lucide-react';
import { OwnershipBadge, getOwnershipType } from '@/components/ui/ownership-badge';
import { ConfidenceIndicator } from '@/components/ui/metrics/confidence-indicator';
import { LiquidityIndicator } from '@/components/ui/metrics/liquidity-indicator';
import { PortfolioSparkline } from '@/components/ui/metrics/sparkline';
import { formatCurrency } from '@/lib/utils';
import { GroupedTableRow } from './grouped-table-row';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { AssetTypeBadge } from '@/components/ui/asset-type-badge';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';
import { AssetSummary } from '@/components/asset/asset-summary';
import { NoMarketData } from '@/components/empty-states';
// import { useDeleteAssetDialog } from '@/features/my-portfolio/components/delete-asset-provider'; // Disabled for v0

interface GroupRowProps {
  assets: Asset[];
  show: Record<string, boolean>;
  marketData: Record<string, { averagePrice: number; confidence: number; salesCount: number; liquidity: string } | undefined>;
  onClickAsset: (a: Asset) => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
}

export const GroupedGroupRow: React.FC<GroupRowProps> = ({ assets, show, marketData, onClickAsset, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  // const { requestDelete } = useDeleteAssetDialog(); // Disabled for v0
  const rep = assets[0];
  const repMarket = marketData[rep.globalAssetId || rep.id] || { averagePrice: 0, confidence: 0, salesCount: 0, liquidity: 'cold' };
  const hasMarket = (repMarket.averagePrice > 0) || (repMarket.salesCount > 0);

  const aggregates = useMemo(() => {
    let totalCurrentAll = 0; // sum of current market values for all assets (for display only if needed)
    let totalComps = 0;
    let purchaseSum = 0; // sum of purchase prices (only those with purchasePrice)
    let purchasedCount = 0; // number of assets with a valid purchasePrice
    let currentForPurchased = 0; // sum of current market values only for purchased assets
    for (const a of assets) {
      const md = marketData[a.globalAssetId || a.id];
      const currentAvg = md?.averagePrice || 0;
      totalCurrentAll += currentAvg;
      totalComps += md?.salesCount || 0;
      if (a.purchasePrice != null && Number(a.purchasePrice) > 0 && a.ownershipStatus !== 'consignment') {
        const p = Number(a.purchasePrice);
        purchaseSum += p;
        purchasedCount += 1;
        currentForPurchased += currentAvg;
      }
    }
    const avgBuy = purchasedCount ? purchaseSum / purchasedCount : 0;
    const unrealizedValue = purchasedCount ? (currentForPurchased - purchaseSum) : null;
    const unrealizedPct = purchasedCount && purchaseSum > 0 ? (unrealizedValue! / purchaseSum) * 100 : null;
    return {
      avgBuy,
      purchasedCount,
      totalCount: assets.length,
      hasBuy: purchasedCount > 0,
      totalComps,
      unrealizedValue,
      unrealizedPct,
    };
  }, [assets, marketData]);

  return (
    <TooltipProvider delayDuration={100}>
    <>
      <tr className="group hover:bg-muted/30 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <td className="px-3 py-3">
          <div className="flex items-center gap-3 w-full text-left select-none">
            <div className="h-auto w-14 bg-muted rounded overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground group-hover:ring-2 group-hover:ring-primary">
              {rep.psaImageFrontUrl ? <img src={rep.psaImageFrontUrl} alt="card" className="object-cover w-full h-full" /> : 'IMG'}
            </div>
            <div className="leading-tight max-w-[22ch]">
              <AssetSummary
                year={rep.year as any}
                setName={rep.setName}
                playerName={rep.playerName}
                cardNumber={rep.cardNumber as any}
                grade={rep.grade as any}
                gradeCompany={(rep as any).grader || 'PSA'}
                certNumber={(rep as any).certNumber as any}
                size="md"
              />
              <div className="text-[11px] text-muted-foreground mt-1">Qty {assets.length}</div>
            </div>
          </div>
        </td>
        {show.ownership && (
          <td className="px-3 py-3 text-right align-middle">
            <div className="flex items-center justify-end gap-2">
              <OwnershipBadge
                type={getOwnershipType(rep)}
                interactive
                onClick={(e) => {
                  e.stopPropagation();
                  if (getOwnershipType(rep) === 'consignment' && (rep as any).consignmentId) {
                    window.open(`/consignments/${(rep as any).consignmentId}`, '_blank');
                  }
                }}
              />
            </div>
          </td>
        )}
  {show.type && <td className="px-3 py-3 text-right align-middle"><AssetTypeBadge type={(rep as any).type} /></td>}
        {show.qty && <td className="px-3 py-3 text-right align-middle">{assets.length}</td>}
        {show.price && (
          <td className="px-3 py-3 text-right align-middle">
            {aggregates.hasBuy ? (
              <div>
                <div className="font-medium">{formatCurrency(aggregates.avgBuy)}</div>
                <div className="text-[11px] text-muted-foreground">Avg buy ({aggregates.purchasedCount}/{aggregates.totalCount})</div>
              </div>
            ) : <NoMarketData />}
          </td>
        )}
        {show.unrealized && (
          <td className="px-3 py-3 text-right align-middle">{!hasMarket || aggregates.unrealizedValue == null ? <NoMarketData /> : (
            <div>
              <div className={aggregates.unrealizedValue >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                {aggregates.unrealizedValue >= 0 ? '+' : ''}{formatCurrency(aggregates.unrealizedValue)}</div>
              {aggregates.unrealizedPct != null && <div className={aggregates.unrealizedValue >= 0 ? 'text-green-600 text-[11px]' : 'text-red-600 text-[11px]'}>{aggregates.unrealizedValue >= 0 ? '+' : ''}{aggregates.unrealizedPct.toFixed(1)}%</div>}
            </div>
          )}</td>
        )}
  {show.confidence && <td className="px-3 py-3 text-center align-middle">{hasMarket ? <ConfidenceIndicator value={repMarket.confidence} /> : <NoMarketData />}</td>}
  {show.liquidity && <td className="px-3 py-3 text-center align-middle">{hasMarket ? <LiquidityIndicator value={repMarket.liquidity} showExitTime={false} /> : <NoMarketData />}</td>}
        {show.current && (
          <td className="px-3 py-3 text-right align-middle font-medium sticky right-24 bg-background z-0">
            {hasMarket ? (
              <>
                <div>{formatCurrency(repMarket.averagePrice)}</div>
                <div className="text-[11px] text-muted-foreground">{repMarket.salesCount} comps</div>
              </>
            ) : (
              <NoMarketData />
            )}
          </td>
        )}
        {show.trend && (
          <td className="px-3 py-3 text-center align-middle sticky right-0 bg-background z-0">
            <div className="flex items-center justify-end">
              <div className="w-28 flex items-center justify-center">
                {hasMarket ? (
                  <PortfolioSparkline assetId={rep.globalAssetId || rep.id} />
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
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 p-0 hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
              >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </td>
        )}
      </tr>
      {expanded && assets.map(a => (
        <GroupedTableRow key={a.id} asset={a} market={marketData[a.globalAssetId || a.id]} show={show} onClick={onClickAsset} onEdit={onEdit} onDelete={onDelete} indent={28} />
      ))}
    </>
    </TooltipProvider>
  );
};
