// 🤖 INTERNAL NOTE:
// Purpose: Individual table row component for buying desk assets
// Exports: TableRow component
// Feature: buying-desk-v0
// Dependencies: ui components, table cell components

import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink } from "lucide-react";
import { ConfidenceIndicator } from "@/components/ui/metrics/confidence-indicator";
import { LiquidityIndicator } from "@/components/ui/metrics/liquidity-indicator";
import { PricingCell } from "./pricing-cell";
import { StatusCell } from "./status-cell";
import { TableRowActions } from "./action-buttons";
import { AutoAcceptBadge } from "./auto-accept-badge";
import type { TableRow as TableRowData, ColumnVisibility } from "../../types/table";

interface TableRowProps {
  row: TableRowData;
  visible: ColumnVisibility;
  selected: boolean;
  editCols: Set<'list' | 'status'>;
  marketData: Record<string, any>;
  hasPendingPricing: boolean;
  formatCurrency: (amount: number) => string;
  onSelect: (checked: boolean) => void;
  onAssetClick: () => void;
  onPriceUpdate: (itemId: string, price: number, assetId?: string) => void;
  onStatusChange: (itemId: string, newStatus: string) => void;
  onMoveToCart: () => void;
  onMoveToEvaluating: () => void;
  onRemoveFromSession: () => void;
}

export function TableRow({
  row,
  visible,
  selected,
  editCols,
  marketData,
  hasPendingPricing,
  formatCurrency,
  onSelect,
  onAssetClick,
  onPriceUpdate,
  onStatusChange,
  onMoveToCart,
  onMoveToEvaluating,
  onRemoveFromSession
}: TableRowProps) {
  const { item, asset, averagePrice, salesCount, confidence, liquidity, buyPrice, displayProfit, seller, purchaseDate, paymentMethod } = row;
  const cert = asset?.certNumber ?? null;
  const profit = displayProfit as number | null;
  const isPurchased = item.status === 'purchased';

  // Pricing data helpers
  const assetId = asset?.id as string | undefined;
  const hasRealData = (averagePrice > 0) || ((salesCount || 0) > 0);
  const pricingData = assetId ? marketData[assetId] : undefined;
  const showSkeleton = !hasRealData && (pricingData?.isLoading || hasPendingPricing);

  return (
    <tr className="group hover:bg-muted/50 transition-colors">
      {/* Selection checkbox */}
      <td className="px-3 py-3 whitespace-nowrap">
        <Checkbox 
          checked={selected} 
          onCheckedChange={onSelect} 
          aria-label={`Select ${asset?.playerName || ''} ${asset?.setName || ''}`} 
        />
      </td>

      {/* Asset information */}
      <td className="px-3 py-3 align-middle">
        <div className="flex items-start gap-3">
          <div className="h-auto w-10 rounded-sm bg-muted overflow-hidden flex-shrink-0">
            {asset?.psaImageFrontUrl ? (
              <img src={asset.psaImageFrontUrl} alt="Card" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">
                No Image
              </div>
            )}
          </div>
          
          <div className="flex flex-col gap-1 min-w-0">
            <button onClick={onAssetClick} className="text-left min-w-0 group">
              <div className="text-xs font-medium tracking-wide uppercase text-muted-foreground leading-tight truncate">
                {asset?.year} {asset?.setName}
              </div>
              <div className="font-semibold text-sm leading-tight truncate flex items-center gap-2">
                <span className="truncate">{asset?.playerName || 'Unknown'}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xs text-foreground leading-tight">
                #{asset?.cardNumber} • {asset?.grade ? `PSA ${asset?.grade}` : ''}
              </div>
              {cert && (
                <div className="text-xs text-muted-foreground leading-tight">
                  Cert# {cert}
                </div>
              )}
            </button>
            
            {/* Auto-Accept Status Badge */}
            {item.status === 'evaluating' && (
              <AutoAcceptBadge 
                hasOfferPrice={buyPrice > 0} 
                marketData={{
                  liquidity: liquidity,
                  confidence: confidence
                }}
              />
            )}
          </div>
        </div>
      </td>

      {/* Buy Price */}
      {visible.list && (
        <td className="px-3 py-3 whitespace-nowrap text-right">
          <PricingCell
            itemId={item.id}
            assetId={asset?.id}
            currentPrice={buyPrice}
            isEditing={editCols.has('list')}
            isPurchased={isPurchased}
            onPriceUpdate={onPriceUpdate}
            formatCurrency={formatCurrency}
          />
        </td>
      )}

      {/* Market Price */}
      {visible.market && (
        <td className="px-3 py-3 whitespace-nowrap text-right">
          {showSkeleton ? (
            <div className="flex flex-col items-end gap-1">
              <div className="font-medium text-foreground text-sm">_</div>
              <div className="text-[11px] text-muted-foreground">_</div>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              <div className="font-medium text-foreground text-sm">
                {formatCurrency(averagePrice)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {salesCount || 0} comps
              </div>
            </div>
          )}
        </td>
      )}

      {/* Profit */}
      {visible.profit && (
        <td className="px-3 py-3 whitespace-nowrap text-right">
          {profit == null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            <span className={`font-medium text-sm ${profit >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(profit))}
            </span>
          )}
        </td>
      )}

      {/* Confidence */}
      {visible.confidence && (
        <td className="px-3 py-3 whitespace-nowrap text-center">
          {showSkeleton ? (
            <span className="text-muted-foreground">_</span>
          ) : (
            <ConfidenceIndicator value={confidence || 0} />
          )}
        </td>
      )}

      {/* Liquidity */}
      {visible.liquidity && (
        <td className="px-3 py-3 whitespace-nowrap text-center">
          {showSkeleton ? (
            <span className="text-muted-foreground">_</span>
          ) : (
            <LiquidityIndicator value={(liquidity || 'cool') as any} />
          )}
        </td>
      )}

      {/* Seller */}
      {visible.seller && (
        <td className="px-3 py-3 whitespace-nowrap text-left">
          {seller?.id ? (
            <a 
              className="text-primary hover:underline" 
              href={`/contacts/${seller.id}`} 
              target="_blank" 
              rel="noreferrer"
            >
              {seller?.name || '—'}
            </a>
          ) : seller?.name ? (
            <span>{seller.name}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Purchase Date */}
      {visible.purchaseDate && (
        <td className="px-3 py-3 whitespace-nowrap text-left">
          {purchaseDate ? (
            new Date(purchaseDate).toLocaleDateString()
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Payment Method */}
      {visible.paymentMethod && (
        <td className="px-3 py-3 whitespace-nowrap text-left">
          {paymentMethod ? (
            String(paymentMethod).replace(/_/g, ' ').replace(/^./, s => s.toUpperCase())
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
      )}

      {/* Status */}
      {visible.status && (
        <td className="px-3 py-3 whitespace-nowrap text-center">
          <StatusCell
            itemId={item.id}
            status={item.status}
            isEditing={editCols.has('status')}
            isPurchased={isPurchased}
            onStatusChange={onStatusChange}
          />
        </td>
      )}

      {/* Actions */}
      <td className="sticky right-0 bg-background px-3 py-3 whitespace-nowrap text-right">
        <TableRowActions
          itemId={item.id}
          asset={asset}
          status={item.status}
          isPurchased={isPurchased}
          onMoveToCart={onMoveToCart}
          onMoveToEvaluating={onMoveToEvaluating}
          onViewAsset={onAssetClick}
          onRemoveFromSession={onRemoveFromSession}
        />
      </td>
    </tr>
  );
}