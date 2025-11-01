// 🤖 INTERNAL NOTE:
// Purpose: Portfolio table row component for v0 with asset details and actions
// Exports: PortfolioTableRowV0 component
// Feature: my-portfolio-v0
// Dependencies: react, lucide-react, @/components/ui, @shared/schema

import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuLabel 
} from '@/components/ui/dropdown-menu';
import { Eye, Edit2, Trash2, MoreHorizontal, ExternalLink } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Asset } from '@shared/schema';
import { AssetTypeBadge } from '@/components/ui/asset-type-badge';
import { AssetOwnershipBadge } from '@/components/status/asset-ownership-badge';
import { ConfidenceIndicator } from '@/components/ui/metrics/confidence-indicator';
import { LiquidityIndicator } from '@/components/ui/metrics/liquidity-indicator';
import { AssetSummary } from '@/components/asset/asset-summary';
import { NoMarketData } from '@/components/empty-states';

interface PortfolioTableRowV0Props {
  asset: Asset;
  show: Record<string, boolean>;
  isLoading: boolean;
  isPending: boolean;
  selected: boolean;
  onToggle: () => void;
  onClickAsset: () => void;
  onEdit?: (asset: Asset) => void;
  onDelete?: (asset: Asset) => void;
  marketMap?: Record<string, { averagePrice: number; confidence: number; liquidity: string; salesCount?: number }>;
  isPricingLoading?: boolean;
}

export const PortfolioTableRowV0 = memo(function PortfolioTableRowV0({
  asset,
  show,
  isLoading,
  isPending,
  selected,
  onToggle,
  onClickAsset,
  onEdit,
  onDelete,
  marketMap,
  isPricingLoading,
}: PortfolioTableRowV0Props) {
  const purchasePrice = parseFloat(asset.purchasePrice?.toString() || '0');
  const pricing = marketMap?.[(asset as any).globalAssetId || asset.id];
  const marketValue = pricing?.averagePrice ?? 0;
  const salesCount = pricing?.salesCount ?? 0;
  const unrealized = (pricing ? marketValue : purchasePrice) - purchasePrice;

  // Helper to get ownership badge click handler for consignments
  const getConsignmentClickHandler = (ownership: string) => {
    if (ownership === 'consignment' && (asset as any).consignmentId) {
      return (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(`/consignments/${(asset as any).consignmentId}`, '_blank');
      };
    }
    return undefined;
  };

  // Type badge now centralized

  const hasMarketData = !!pricing && !isPricingLoading;

  return (
    <TooltipProvider delayDuration={100}>
    <tr className="group hover:bg-muted/25 transition-colors border-b">
      {/* Selection */}
      <td className="p-4">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
        />
      </td>

      {/* Asset */}
      <td className="p-4">
        <div className="flex items-center gap-3">
          {((asset as any).assetImages?.[0] || asset.psaImageFrontUrl) && (
            <img
              src={(asset as any).assetImages?.[0] || asset.psaImageFrontUrl}
              alt={asset.title || 'Card'}
              className="w-12 h-16 flex-shrink-0 object-cover rounded border"
            />
          )}
          <div className="min-w-0 flex-1">
            <Button
              variant="link"
              className="h-auto p-0 text-left font-medium text-foreground hover:text-primary"
              onClick={onClickAsset}
            >
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
            </Button>
          </div>
        </div>
      </td>

      {/* Ownership */}
      {show.ownership && (
        <td className="p-4">
          <div className="flex items-center gap-2">
            <div onClick={getConsignmentClickHandler(asset.ownershipStatus || 'own')}>
              <AssetOwnershipBadge
                status={asset.ownershipStatus || 'own'}
                soldPrice={(asset as any).soldPrice ? parseFloat((asset as any).soldPrice) : null}
                soldDate={(asset as any).soldAt}
              />
            </div>
          </div>
        </td>
      )}

      {/* Type */}
      {show.type && (
        <td className="p-4">
          <AssetTypeBadge type={asset.type || 'raw'} />
        </td>
      )}

      {/* Qty */}
      {show.qty && (
        <td className="p-4">
          <span className="font-mono">1</span>
        </td>
      )}

      {/* Purchase Price */}
      {show.price && (
        <td className="p-4">
          <span className="font-mono">
            {asset.ownershipStatus === 'consignment' ? '—' : 
             (purchasePrice > 0 ? formatCurrency(purchasePrice) : '—')}
          </span>
        </td>
      )}

      {/* Market Value */}
      {show.value && (
        <td className="p-4">
          {hasMarketData && marketValue > 0 ? (
            <div className="text-right">
              <div className="font-mono">{formatCurrency(marketValue)}</div>
              <div className="text-[11px] text-muted-foreground">{salesCount || 0} comps</div>
            </div>
          ) : (
            <NoMarketData />
          )}
        </td>
      )}

      {/* Unrealized */}
      {show.unrealized && (
        <td className="p-4">
          {hasMarketData && unrealized !== 0 ? (
            <span className={`font-mono ${unrealized > 0 ? 'text-green-600' : unrealized < 0 ? 'text-red-600' : ''}`}>{formatCurrency(unrealized)}</span>
          ) : (
            <NoMarketData />
          )}
        </td>
      )}

      {/* Confidence */}
      {show.confidence && (
        <td className="p-4">
          {hasMarketData && typeof pricing?.confidence === 'number' ? (
            <div className="flex justify-center">
              <ConfidenceIndicator value={pricing.confidence || 0} />
            </div>
          ) : (
            <NoMarketData />
          )}
        </td>
      )}

      {/* Liquidity */}
      {show.liquidity && (
        <td className="p-4">
          {hasMarketData && pricing?.liquidity ? (
            <div className="flex justify-center">
              <LiquidityIndicator value={pricing.liquidity} showExitTime={false} />
            </div>
          ) : (
            <NoMarketData />
          )}
        </td>
      )}

      {/* Trend */}
      {show.trend && (
        <td className="p-4">
          <NoMarketData />
        </td>
      )}

      {/* Actions */}
      <td className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onClickAsset}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(`/assets/${asset.id}`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </DropdownMenuItem>
            {onEdit && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onEdit(asset)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              </>
            )}
            {onDelete && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(asset)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  </TooltipProvider>
  );
});

PortfolioTableRowV0.displayName = 'PortfolioTableRowV0';
