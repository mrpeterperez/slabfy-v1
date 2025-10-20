// ListPriceDialog.tsx
// Optimized full-screen dialog with better spacing and responsive design
// - Auto-selects market value preset on open (value seeded from market or initial)
// - Dynamic price text sizing based on length
// - Tighter, cleaner keypad without borders
// - Better height optimization for all screen sizes
// - Smooth responsive scaling
// - EXACT header/title/button sizing to match QuickPay dialog

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn, formatCurrency as coreFormatCurrency } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

interface ListPriceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  initialListPrice?: number | null;
  purchasePrice?: number | null;
  marketValueOverride?: number | null;
  salesCountOverride?: number | null;
  onSave: (price: number) => Promise<void> | void;
}

interface PricingData { averagePrice: number; salesCount?: number; }
interface SalesHistoryResponse { sales_history?: Array<any>; }

// Removed buggy scrollable preset system.

function haptic(duration = 12) {
  try { if ('vibrate' in navigator) (navigator as any).vibrate?.(duration); } catch {}
}

export function ListPriceDialog({
  open,
  onOpenChange,
  assetId,
  initialListPrice,
  purchasePrice,
  marketValueOverride,
  salesCountOverride,
  onSave
}: ListPriceDialogProps) {
  const [input, setInput] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [activeAction, setActiveAction] = React.useState<number | null>(null); // quick action index

  // Lock background scroll when dialog is open (match QuickPay full-screen behavior)
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = (document.body.style as any).WebkitOverflowScrolling;
    document.body.style.overflow = 'hidden';
    (document.body.style as any).WebkitOverflowScrolling = 'auto';
    return () => {
      document.body.style.overflow = prevOverflow;
      (document.body.style as any).WebkitOverflowScrolling = prevTouch;
    };
  }, [open]);

  // Escape to close (matches QuickPay)
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  // Fetch market pricing
  const { data: pricingData } = useQuery<PricingData>({
    queryKey: [`/api/pricing/${assetId}`],
    queryFn: async () => {
      const r = await fetch(`/api/pricing/${assetId}`);
      if (!r.ok) throw new Error('pricing fetch failed');
      return r.json();
    },
    enabled: open && !!assetId && (marketValueOverride == null)
  });

  // Fetch last sale
  const { data: salesData } = useQuery<SalesHistoryResponse>({
    queryKey: ['/api/sales-comp-universal', assetId],
    queryFn: async () => {
      const r = await fetch(`/api/sales/sales-comp-universal/${assetId}`);
      if (!r.ok) throw new Error('sales fetch failed');
      return r.json();
    },
    enabled: open && !!assetId
  });

  // derive last sale price
  const lastSaleRecord = salesData?.sales_history?.[0];
  const lastSalePrice = React.useMemo(() => {
    if (!lastSaleRecord) return null;
    const salePriceRaw =
      lastSaleRecord?.sold_price?.value ??
      lastSaleRecord?.finalPrice ??
      lastSaleRecord?.price?.value ??
      lastSaleRecord?.totalPrice ?? 0;
    const shipping = lastSaleRecord?.shipping ?? 0;
    const numeric = parseFloat(String(salePriceRaw)) + parseFloat(String(shipping));
    return isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [lastSaleRecord]);

  const marketValue = marketValueOverride != null ? marketValueOverride : (pricingData?.averagePrice ?? null);
  const salesCount = salesCountOverride != null ? salesCountOverride : (pricingData as any)?.salesCount;

  // Initialize value when opened (auto-seed). Market pill selected by default if market exists.
  React.useEffect(() => {
    if (!open) return;
    if (initialListPrice != null && !isNaN(initialListPrice)) {
      setInput(formatNumberForEdit(initialListPrice));
      // If user already had a saved list price, we don't auto-select a pill.
      setActiveAction(null);
    } else if (marketValue != null) {
      setInput(formatNumberForEdit(marketValue));
  // Market pill index = 4 in current quickActions ordering
  setActiveAction(4);
    } else {
      setInput('');
      setActiveAction(null);
    }
  }, [open, initialListPrice, marketValue]);

  function formatNumberForDisplay(value: number | null): string {
    if (value == null || isNaN(value)) return '-';
    return coreFormatCurrency(value);
  }
  function formatNumberForEdit(value: number): string {
    return value.toFixed(2).replace(/\.00$/, '');
  }
  const currentPrice = React.useMemo(() => {
    const num = parseFloat(input.replace(',', '.'));
    return isFinite(num) ? num : 0;
  }, [input]);

  // Dynamic font size based on price length
  // Breakpoints: base (0-639px phones) → sm (640px+ large phones) → md (768px+ tablets/desktop)
  // Each size class gets smaller as the price string gets longer
  const getPriceTextSize = () => {
    const priceStr = coreFormatCurrency(currentPrice);
    const len = priceStr.length;
    
    // Short prices (≤$9,999): Show really big
    if (len <= 7) return 'text-6xl sm:text-7xl md:text-8xl';
    
    // Medium prices (≤$999,999): A bit smaller  
    if (len <= 9) return 'text-5xl sm:text-6xl md:text-7xl';
    
    // Long prices (≤$99,999,999): Smaller still
    if (len <= 11) return 'text-4xl sm:text-5xl md:text-6xl';
    
    // Very long prices: Smallest size
    return 'text-3xl sm:text-4xl md:text-5xl';
  };

  // Profit vs cost/market
  const profitBase = purchasePrice != null && purchasePrice > 0 ? purchasePrice : (marketValue ?? 0);
  const profit = currentPrice > 0 ? currentPrice - profitBase : 0;
  const profitColor = profit >= 0 ? 'text-success' : 'text-destructive';

  // Keypad logic
  const handleKey = (val: string) => {
  // Any manual keypad interaction clears active quick action selection
  if (activeAction !== null) setActiveAction(null);
    setInput(prev => {
      if (val === 'back') { haptic(8); return prev.slice(0, -1); }
      if (val === '.') {
        if (prev.includes('.')) return prev;
        haptic(6);
        return prev === '' ? '0.' : prev + '.';
      }
      haptic(6);
      const next = prev + val;
      const [int, dec] = next.split('.');
      if (dec && dec.length > 2) return prev;
      if (int.length > 7) return prev;
      return next.replace(/^0+(\d)/, '$1');
    });
  };
  const backspaceTimer = React.useRef<number | null>(null);
  const backspaceInterval = React.useRef<number | null>(null);
  const startBackspace = () => {
    handleKey('back');
    backspaceTimer.current = window.setTimeout(() => {
      backspaceInterval.current = window.setInterval(() => handleKey('back'), 50);
    }, 300);
  };
  const stopBackspace = () => {
    if (backspaceTimer.current) { clearTimeout(backspaceTimer.current); backspaceTimer.current = null; }
    if (backspaceInterval.current) { clearInterval(backspaceInterval.current); backspaceInterval.current = null; }
  };

  const keypadButtons: Array<{ label: string; value: string; aria?: string }>[] = [
    [ { label: '1', value: '1' }, { label: '2', value: '2' }, { label: '3', value: '3' } ],
    [ { label: '4', value: '4' }, { label: '5', value: '5' }, { label: '6', value: '6' } ],
    [ { label: '7', value: '7' }, { label: '8', value: '8' }, { label: '9', value: '9' } ],
    [ { label: '.', value: '.', aria: 'Decimal' }, { label: '0', value: '0' }, { label: '⌫', value: 'back', aria: 'Backspace' } ],
  ];

  // Quick action pills with Cost + ±15% added. Order: deeper discounts → anchors → upsides
  interface QuickAction { label: string; kind: 'percent' | 'market' | 'lastSale' | 'cost'; value?: number }
  const quickActions: QuickAction[] = React.useMemo(() => {
    const arr: QuickAction[] = [
      { label: '-15%', kind: 'percent', value: -0.15 },
      { label: '-10%', kind: 'percent', value: -0.10 },
      { label: '-5%',  kind: 'percent', value: -0.05 },
      { label: 'Cost', kind: 'cost' },
      { label: 'Market', kind: 'market' },
      { label: 'Last Sale', kind: 'lastSale' },
      { label: '+5%',  kind: 'percent', value: 0.05 },
      { label: '+10%', kind: 'percent', value: 0.10 },
      { label: '+15%', kind: 'percent', value: 0.15 },
    ];
    return arr;
  }, []);

  const applyQuickAction = (idx: number) => {
    const action = quickActions[idx];
    if (!action) return;
    let target: number | null = null;
    if (action.kind === 'percent') {
      const base = (marketValue ?? lastSalePrice ?? currentPrice);
      if (base != null) target = base * (1 + (action.value ?? 0));
    } else if (action.kind === 'market') {
      target = marketValue ?? null;
    } else if (action.kind === 'lastSale') {
      target = lastSalePrice ?? null;
    } else if (action.kind === 'cost') {
      target = purchasePrice != null && purchasePrice > 0 ? purchasePrice : null;
    }
    if (target != null && isFinite(target) && target > 0) {
      haptic(10);
      setActiveAction(idx);
      setInput(formatNumberForEdit(target));
    }
  };

  const canSave = currentPrice > 0 && !saving;
  async function handleSave() {
    if (!canSave) return;
    try {
      setSaving(true);
      await onSave(currentPrice);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="lp-title"
          className="fixed inset-0 z-[999] flex flex-col bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Header — EXACT same rhythm as QuickPay */}
          <div className="relative flex items-center justify-center px-4 py-4 border-b border-border">
            <h1 id="lp-title" className="text-base font-medium text-center">Set Your List Price</h1>
            <button
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="absolute right-4 flex items-center justify-center w-10 h-10 rounded-lg hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Body: scrollable center + pinned bottom actions; dynamic viewport height like QuickPay */}
          <div className="flex-1 flex flex-col h-[100dvh] md:h-screen overflow-hidden">
            {/* Scrollable center - NOW WITH FLEX CENTERING */}
            <div className="flex-1 overflow-y-auto flex items-center">
              <div className="w-full px-4 py-6">
                {/* Price & meta — centered vertically and horizontally */}
                <div className="text-center">
                  <div className={cn(
                    "font-heading font-bold tracking-tight mb-3 transition-all duration-200",
                    getPriceTextSize()
                  )}>
                    {currentPrice > 0 ? coreFormatCurrency(currentPrice) : '$0'}
                  </div>
                  <div className={cn('text-sm font-medium mb-4', profitColor)}>
                    {profit >= 0 ? '+ ' : '- '}{coreFormatCurrency(Math.abs(profit))}
                    <span className="text-muted-foreground ml-1">
                      vs {purchasePrice!=null && purchasePrice>0 ? 'Cost' : 'Market'}
                    </span>
                  </div>

                  

                </div>
              </div>
            </div>
{/* Stats row above border line */}
                  <div className="grid grid-cols-3 gap-16 max-w-sm mx-auto mb-4">
                    <div className="text-center">
                      <div className="font-semibold text-sm sm:text-base">
                        {purchasePrice!=null && purchasePrice>0 ? formatNumberForDisplay(purchasePrice) : '-'}
                      </div>
                      <div className="text-xs text-muted-foreground">Your Cost</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm sm:text-base">{formatNumberForDisplay(marketValue)}</div>
                      <div className="text-xs text-muted-foreground">Market</div>
                      {salesCount ? (
                        <div className="text-[10px] text-muted-foreground uppercase">{salesCount} comps</div>
                      ) : null}
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-sm sm:text-base">{formatNumberForDisplay(lastSalePrice)}</div>
                      <div className="text-xs text-muted-foreground">Last Sale</div>
                    </div>
                  </div>
            {/* Pinned keypad (aligned to max-w-md like QuickPay's bottom controls) */}
            <div className="mt-auto w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-glass border-t border-border">
              <div className="max-w-md mx-auto px-4 sm:px-6 pt-2 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
                {/* Quick actions now positioned directly above Save and keypad */}
        <div className="overflow-x-auto no-scrollbar -mx-4 sm:-mx-6 px-4 sm:px-6 mb-3">
                  <div className="mt-1 flex gap-2 min-w-max">
                    {quickActions.map((a, i) => {
                      const active = i === activeAction;
                      const isLastSale = a.kind === 'lastSale';
          const isCost = a.kind === 'cost';
          const disabled = (isLastSale && (lastSalePrice == null)) || (isCost && !(purchasePrice!=null && purchasePrice>0));
                      return (
                        <button
                          key={a.label}
                          onClick={() => { if (!disabled) applyQuickAction(i); }}
                          type="button"
                          className={cn(
                            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                            'bg-muted hover:bg-muted/70',
                            active && 'bg-primary text-primary-foreground hover:bg-primary/90',
                            disabled && 'opacity-40 cursor-not-allowed hover:bg-muted'
                          )}
                          disabled={disabled}
                        >
                          {a.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mb-3">
                  <Button
                    onClick={handleSave}
                    disabled={!canSave}
                    className="mt-1 w-full h-12 sm:h-14 text-md sm:text-base rounded-full shadow-md"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
                <div
                  className="grid gap-1 select-none"
                  aria-label="Number pad"
                >
                  {keypadButtons.map((row,i)=>(
                    <div key={i} className="grid grid-cols-3 gap-1">
                      {row.map(btn => {
                        const isBack = btn.value === 'back';
                        const baseClasses = cn(
                          'rounded-lg text-2xl sm:text-3xl font-semibold py-3 sm:py-4',
                          'active:scale-95 transition-all duration-75',
                          'bg-muted/30 hover:bg-muted/50',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          'min-h-[44px] sm:min-h-[44px]'
                        );
                        return isBack ? (
                          <button
                            key={btn.value}
                            aria-label={btn.aria ?? btn.label}
                            onMouseDown={() => { startBackspace(); }}
                            onMouseUp={stopBackspace}
                            onMouseLeave={stopBackspace}
                            onTouchStart={() => { startBackspace(); }}
                            onTouchEnd={stopBackspace}
                            onContextMenu={(e)=>e.preventDefault()}
                            className={baseClasses}
                          >
                            {btn.label}
                          </button>
                        ) : (
                          <button
                            key={btn.value}
                            aria-label={btn.aria ?? `Digit ${btn.label}`}
                            onClick={()=>handleKey(btn.value)}
                            className={baseClasses}
                          >
                            {btn.label}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Backwards compatibility alias (so existing imports won't break)
export const ListPriceDrawer = ListPriceDialog;
export default ListPriceDialog;