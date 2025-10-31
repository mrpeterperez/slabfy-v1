import React, { useMemo, useState, useCallback } from 'react';
import type { Asset } from '@shared/schema';
import { useSimplePricing } from '../../hooks/use-simple-pricing';
import { ExternalLink, MoreHorizontal, Eye, Edit2, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { ConfidenceIndicator } from '@/components/ui/metrics/confidence-indicator';
import { LiquidityIndicator } from '@/components/ui/metrics/liquidity-indicator';
import { PortfolioSparkline } from '@/components/ui/metrics/sparkline';
import { OwnershipBadge, getOwnershipType } from '@/components/ui/ownership-badge';
import { formatCurrency } from '@/lib/utils';
import { UnrealizedGain } from '@/components/ui/unrealized-gain';
import { AssetTypeBadge } from '@/components/ui/asset-type-badge';
import { AssetSummary } from '@/components/asset/asset-summary';
import { AssetActions } from '@/features/asset-details/components/asset-actions';

interface Props { assets: Asset[]; visible?: Record<string, boolean>; }

export function PortfolioTableSimpleV0({ assets, visible }: Props) {
  const [rows, setRows] = useState(assets);
  const { toast } = useToast();
  const { pricing } = useSimplePricing(rows);
  const show = useMemo(() => ({
  ownership: visible?.ownership ?? true,
  type: visible?.type ?? true,
  qty: visible?.qty ?? true,
  price: visible?.price ?? true, // buy price
  current: visible?.current ?? true, // current market price
  unrealized: visible?.unrealized ?? true,
  confidence: visible?.confidence ?? true,
  liquidity: visible?.liquidity ?? true,
  trend: true,
  }), [visible]);

  return (
    <>
      <table className="min-w-full divide-y divide-border text-sm">
        <thead className="bg-background">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Asset</th>
            {show.ownership && <th className="text-right px-3 py-2 font-medium">Owner</th>}
            {show.type && <th className="text-right px-3 py-2 font-medium">Type</th>}
            {show.qty && <th className="text-right px-3 py-2 font-medium">Qty</th>}
            {show.price && <th className="text-right px-3 py-2 font-medium">Buy Price</th>}
            {show.unrealized && <th className="text-right px-3 py-2 font-medium">Unrealized</th>}
            {show.confidence && <th className="text-center px-3 py-2 font-medium">Confidence</th>}
            {show.liquidity && <th className="text-center px-3 py-2 font-medium">Liquidity</th>}
            {show.current && <th className="text-right px-3 py-2 font-medium sticky right-24 bg-background z-0">Price</th>}
            {show.trend && <th className="text-center px-3 py-2 font-medium sticky right-0 bg-background z-0">Trend</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map(a => {
            const id = a.globalAssetId || a.id;
            const m = pricing[id];
            const qty = 1; // v0 simple table treats each row as single asset like original
            const buyPrice = a.purchasePrice != null ? Number(a.purchasePrice) : null;
            const current = m ? m.averagePrice : 0;
            return (
              <tr key={a.id} className="hover:bg-muted/30">
                <td className="px-3 py-3">
                  <button
                    type="button"
                    className="flex items-center gap-3 w-full text-left group focus:outline-none"
                    onClick={() => { window.location.href = `/assets/${a.id}`; }}
                  >
                    <div className="h-14 w-10 bg-muted rounded overflow-hidden flex items-center justify-center text-[10px] text-muted-foreground group-hover:ring-2 group-hover:ring-primary">
                      {a.psaImageFrontUrl ? (
                        <img src={a.psaImageFrontUrl} alt="card" className="object-cover w-full h-full" />
                      ) : 'IMG'}
                    </div>
                    <div className="leading-tight max-w-[22ch]">
                      <AssetSummary
                        year={a.year as any}
                        setName={a.setName}
                        playerName={a.playerName}
                        cardNumber={a.cardNumber as any}
                        grade={a.grade as any}
                        gradeCompany={(a as any).grader || 'PSA'}
                        certNumber={(a as any).certNumber as any}
                        size="md"
                      />
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </button>
                </td>
                {show.ownership && (
                  <td className="px-3 py-3 text-right align-middle">
                    <OwnershipBadge
                      type={getOwnershipType(a)}
                      interactive={getOwnershipType(a) === 'consignment'}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (getOwnershipType(a) === 'consignment' && (a as any).consignmentId) {
                          window.open(`/consignments/${(a as any).consignmentId}`, '_blank');
                        }
                      }}
                    />
                  </td>
                )}
                {show.type && (
                  <td className="px-3 py-3 text-right align-middle"><AssetTypeBadge type={(a as any).type} /></td>
                )}
                {show.qty && (
                  <td className="px-3 py-3 text-right align-middle">{qty}</td>
                )}
                {show.price && (
                  <td className="px-3 py-3 text-right align-middle">
                    {a.ownershipStatus === 'consignment' ? (
                      <div className="font-medium text-muted-foreground">—</div>
                    ) : buyPrice != null ? (
                      <>
                        <div className="font-medium">{formatCurrency(buyPrice)}</div>
                        {a.purchaseDate && (
                          <div className="text-[11px] text-muted-foreground">
                            {(() => { const s = String(a.purchaseDate); const d = new Date(s.includes('T') ? s : `${s}T12:00:00`); return d.toLocaleDateString(); })()}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="font-medium text-muted-foreground">—</div>
                    )}
                  </td>
                )}
                {show.unrealized && (
                  <td className="px-3 py-3 text-right align-middle w-32">
                    <UnrealizedGain purchasePrice={parseFloat(a.purchasePrice?.toString() || '0')} currentValue={current} />
                  </td>
                )}
                {show.confidence && (
                  <td className="px-3 py-3 text-center align-middle"><ConfidenceIndicator value={m ? m.confidence : 0} /></td>
                )}
                {show.liquidity && (
                  <td className="px-3 py-3 text-center align-middle"><LiquidityIndicator value={m ? m.liquidity : 'cold'} showExitTime={false} /></td>
                )}
                {show.current && (
                  <td className="px-3 py-3 text-right align-middle font-medium sticky right-24 bg-background z-0">
                    <div>{formatCurrency(current)}</div>
                    <div className="text-[11px] text-muted-foreground">{m ? m.salesCount : 0} comps</div>
                  </td>
                )}
                {show.trend && (
                  <td className="px-3 py-3 text-center align-middle sticky right-0 bg-background z-0">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-28"><PortfolioSparkline assetId={id} /></div>
                      <AssetActions asset={a} />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export default PortfolioTableSimpleV0;