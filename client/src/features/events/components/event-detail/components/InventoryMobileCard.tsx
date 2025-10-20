import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit2, MoreHorizontal, Plus, Zap, Droplet, LineChart } from "lucide-react";
import { ListPriceDrawer } from '@/components/ui/listprice-drawer';
import { OwnershipBadge, getOwnershipType } from '@/components/ui/ownership-badge';
import { PLACEHOLDER_IMAGE_URL } from "@/lib/constants";

// Local helpers duplicated from inventory-section to keep component self-contained.
// If these exist elsewhere, we can import instead.
function getStatusColor(status: string) {
  switch ((status || "available").toLowerCase()) {
    case "available":
  return "bg-brand-subtle text-brand-foreground";
    case "sold":
  return "bg-success-subtle text-success";
    case "pending":
  return "bg-warning-subtle text-warning";
    case "removed":
  return "bg-destructive-subtle text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}

const LiquidityIndicator = ({ liquidity }: { liquidity: string }) => {
  const level = (() => {
    switch ((liquidity || "cool").toLowerCase()) {
      case "fire":
        return 5;
      case "hot":
        return 4;
      case "warm":
        return 3;
      case "cool":
        return 2;
      case "cold":
        return 1;
      default:
        return 2;
    }
  })();
  const pct = (() => {
    switch ((liquidity || "cool").toLowerCase()) {
      case "fire":
        return 85;
      case "hot":
        return 70;
      case "warm":
        return 50;
      case "cool":
        return 30;
      case "cold":
        return 15;
      default:
        return 30;
    }
  })();
  const max = 5;
  const barClass = (i: number) => {
  if (i >= level) return "bg-muted";
  if (level >= 4) return "bg-success";
  if (level >= 2) return "bg-warning";
  return "bg-destructive";
  };
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`w-0.5 h-3 rounded-sm ${barClass(i)}`} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground min-w-[28px] text-right">{pct}%</span>
    </div>
  );
};

const ConfidenceIndicator = ({ confidence }: { confidence: number }) => {
  const level = Math.ceil((confidence / 100) * 5);
  const max = 5;
  const barClass = (i: number) => {
  if (i >= level) return "bg-muted";
  if (confidence >= 80) return "bg-success";
  if (confidence >= 50) return "bg-warning";
  return "bg-destructive";
  };
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: max }).map((_, i) => (
          <div key={i} className={`w-0.5 h-3 rounded-sm ${barClass(i)}`} />
        ))}
      </div>
      <span className="text-xs text-muted-foreground min-w-[28px] text-right">{Math.round(confidence)}%</span>
    </div>
  );
};

export type ColumnDef = { key: string; visible: boolean; locked?: boolean };

export type Row = {
  item: any;
  market: any;
  averagePrice: number;
  salesCount: number;
  listPrice: number;
  purchasePrice: number;
  compPct: number | null;
  confidence: number;
  displayProfit: number | null;
};

export type InventoryMobileCardProps = {
  row: Row;
  columns: ColumnDef[];
  onListPriceChange: (itemId: string, price: number) => Promise<void> | void;
  onAssetClick: (item: any) => void;
  onDeleteItem: (itemId: string) => Promise<void> | void;
  onOpenStatusDialog: (itemId: string, currentStatus: string) => void;
  onAddToCart?: (item: any) => void;
  isInCart?: (id: string) => boolean;
  onRemoveFromCart?: (id: string) => void;
};

export function InventoryMobileCard({
  row,
  columns,
  onListPriceChange,
  onAssetClick,
  onDeleteItem,
  onOpenStatusDialog,
  onAddToCart,
  isInCart,
  onRemoveFromCart,
}: InventoryMobileCardProps) {
  const { item, market, averagePrice, salesCount, listPrice, purchasePrice, confidence, displayProfit } = row;

  // List price drawer state
  const [listPriceDrawerOpen, setListPriceDrawerOpen] = React.useState(false);

  const cert =
    item.certNumber ?? item.cert_number ?? item.cert ?? item.certNo ?? item.certno ?? null;

  // columns
  const visible = (key: string) => !!columns.find((c) => c.key === key)?.visible;
  const typeVisible = visible("type");
  const listPriceVisible = visible("listPrice");
  const valueVisible = visible("value");
  const confidenceVisible = visible("confidence");
  const liquidityVisible = visible("liquidity");
  const profitVisible = visible("profit");
  const statusVisible = visible("status");
  const actionVisible = visible("action");

  const currentList = Number(item.askingPrice ?? listPrice ?? 0) || 0;
  const profitVal = typeof displayProfit === "number" ? displayProfit : null;
  const profitColor =
    profitVal == null ? "text-muted-foreground" : profitVal >= 0 ? "text-success" : "text-destructive";

  return (
    <div className="py-3">
      <div className="flex gap-3">
        {/* Left: Slab image */}
        <div className="relative h-full w-28 shrink-0 overflow-hidden rounded-md bg-muted">
          <img src={item.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL} alt={item.playerName || ""} className="h-full w-full object-cover" loading="lazy" />
        </div>

        {/* Right: Content + Controls */}
        <div className="min-w-0 flex-1 flex gap-3">
          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Chips row (Type • Ownership • Status) */}
            <div className="flex items-center gap-2 flex-wrap">
              {typeVisible && (
                <Badge variant="outline" className="text-[11px] px-2 py-0.5">{item.type ? item.type.charAt(0).toUpperCase() + item.type.slice(1) : "Graded"}</Badge>
              )}
              {columns.find(c => c.key === 'ownership')?.visible && (
                <OwnershipBadge type={getOwnershipType(item)} />
              )}
              {statusVisible && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusColor(item.status || 'available')}`}>
                  {(item.status || 'available').replace(/^\w/, (c: string) => c.toUpperCase())}
                </span>
              )}
            </div>

            {/* Title and subtitle */}
            <div className="mt-2">
              <div className="text-[15px] font-extrabold leading-5 uppercase line-clamp-2">
                {(item.playerName || 'Unknown')} {item.year} {item.setName} #{item.cardNumber}
              </div>
              <div className="mt-1 text-[12px] text-muted-foreground leading-4">
                PSA {item.grade} {cert ? ` | Cert #${cert}` : ''}
              </div>
            </div>

            {/* List price (left) • Profit (now below list price) */}
            {(listPriceVisible || profitVisible) && (
              <div className="mt-3">
                {listPriceVisible && (
                  <div>
                    <div className="text-[11px] tracking-wide text-muted-foreground uppercase">List Price</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="text-2xl font-bold">${currentList.toFixed(2)}</div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setListPriceDrawerOpen(true)}
                        aria-label="Edit list price"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                {profitVisible && (
                  <div className="mt-1 text-[12px]">
                    <span className="text-muted-foreground">Profit: </span>
                    <span className={`${profitColor} font-medium`}>
                      {profitVal !== null ? `${profitVal >= 0 ? '+' : ''}$${Math.abs(profitVal).toFixed(2)}` : '—'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right controls: 3-dot menu (top-right) + centered Add (+) */}
          <div className="relative flex-none w-10">
            <div className="absolute top-0 right-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Item actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onOpenStatusDialog(item.id, (item.status || 'available').toLowerCase())}>Change status</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onAssetClick(item)}>View Asset</DropdownMenuItem>
                  {isInCart?.(item.id) && (
                    <DropdownMenuItem onClick={() => onRemoveFromCart?.(item.id)}>Remove From Cart</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {String(item.status || 'available').toLowerCase() === 'sold' ? (
                    <DropdownMenuItem onClick={() => onOpenStatusDialog(item.id, 'sold')}>Undo Sell</DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem className="text-destructive" onClick={() => onDeleteItem(item.id)}>Remove from Show</DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {actionVisible && (
              <Button
                variant="outline"
                size="icon"
                className="absolute right-0 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border border-brand text-brand hover:bg-brand-subtle"
                onClick={() => onAddToCart?.(item)}
                disabled={!(item.status === 'available' || item.status === 'pending' || !item.status) || !!isInCart?.(item.id)}
                aria-label="Add to cart"
              >
                <Plus className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom full-width: Confidence • Liquidity • Market Value (single line) */}
      {(confidenceVisible || liquidityVisible || (valueVisible && averagePrice > 0)) && (
        <div className="mt-3">
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground whitespace-nowrap overflow-hidden">
            {confidenceVisible && typeof confidence === 'number' && confidence > 0 && (
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <ConfidenceIndicator confidence={confidence} />
              </div>
            )}
            {liquidityVisible && (
              <div className="flex items-center gap-2">
                <Droplet className="h-4 w-4" />
                <LiquidityIndicator liquidity={market?.liquidityRating || 'cool'} />
              </div>
            )}
            {valueVisible && averagePrice > 0 && (
              <div className="flex items-center gap-2 min-w-0">
                <LineChart className="h-4 w-4" />
                <span className="font-semibold text-foreground">${averagePrice.toFixed(2)}</span>
                {salesCount > 0 && <span> • {salesCount} COMPS</span>}
              </div>
            )}
          </div>
        </div>
      )}
      {/* List Price Drawer */}
      {listPriceVisible && (
        <ListPriceDrawer
          open={listPriceDrawerOpen}
            onOpenChange={setListPriceDrawerOpen}
            assetId={item.id}
            initialListPrice={currentList}
            purchasePrice={purchasePrice}
            marketValueOverride={averagePrice || null}
            salesCountOverride={salesCount || null}
            onSave={async (price:number) => {
              await onListPriceChange(item.id, price);
            }}
        />
      )}
    </div>
  );
}
