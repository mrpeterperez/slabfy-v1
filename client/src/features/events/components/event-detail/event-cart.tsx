// 🤖 INTERNAL NOTE:
// Purpose: Event cart component with BuyListCart-style UI/UX
// Exports: EventCart component
// Feature: events

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ShoppingCart, X, Edit2, Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/auth-provider";
import { loadUserPrefs, saveUserPrefs } from "@/lib/user-preferences";
import type { Event } from "shared/schema";

export interface CartItem {
  id: string;
  item: any;
  price: number;
}

interface EventCartProps {
  event: Event;
  cartOpen: boolean;
  onCartOpenChange: (open: boolean) => void;
  cartItems: CartItem[];
  onCartItemsChange: (items: CartItem[]) => void;
  onCheckout: () => void;
  onReserve: () => void;
  children: React.ReactNode;
  onTotalsChange?: (totals: {
    totalSell: number;
    discountedSell: number;
  finalSell: number;
    totalMarket: number;
    totalPurchase: number;
    discountAmount: number;
    showDiscount: boolean;
    discountType: 'percent' | 'amount';
    discountValue: number;
  }) => void;
}

export function EventCart({
  event,
  cartOpen,
  onCartOpenChange,
  cartItems,
  onCartItemsChange,
  onCheckout,
  onReserve,
  children,
  onTotalsChange
}: EventCartProps) {
  const { user, loading: authLoading } = useAuth();
  
  // Discount state
  const [showDiscount, setShowDiscount] = useState(false);
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState<string>('');
  // Round-off state (default true): rounds up discounted total to nearest $5
  const [roundOff, setRoundOff] = useState<boolean>(true);
  
  // Edit price functionality
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [saveIndicators, setSaveIndicators] = useState<Record<string, 'saving' | 'saved'>>({});
  const [editingPrice, setEditingPrice] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Desktop resizable cart defaults (~28rem max-w-md)
  const desktopAreaRef = useRef<HTMLDivElement>(null);
  const [cartDefaultPercent, setCartDefaultPercent] = useState<number>(28);
  useEffect(() => {
    if (!cartOpen) return;
    const area = desktopAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const targetCartWidth = 448; // ~28rem
    const availableWidth = rect.width;
    if (availableWidth > 0) {
      const percent = Math.min(50, Math.max(18, (targetCartWidth / availableWidth) * 100));
      const clamped = Math.round(percent);
      setCartDefaultPercent(clamped);
    }
  }, [cartOpen]);

  // Cart persistence (rehydrate once and then save on every change)
  const cartHydratedRef = useRef(false);
  useEffect(() => {
    if (cartHydratedRef.current) return;
    if (!user?.id || !event.id) return;
    try {
      const stored = localStorage.getItem(`eventCart:${user.id}:${event.id}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) onCartItemsChange(parsed);
      }
    } catch {}
    cartHydratedRef.current = true;
  }, [user?.id, event.id, onCartItemsChange]);

  useEffect(() => {
    if (!user?.id || !event.id) return;
    try { localStorage.setItem(`eventCart:${user.id}:${event.id}`, JSON.stringify(cartItems)); } catch {}
  }, [cartItems, user?.id, event.id]);

  // Load saved cart preferences once
  const prefsLoaded = useRef(false);
  useEffect(() => {
    if (prefsLoaded.current) return;
    (async () => {
      const prefs = await loadUserPrefs(user?.id);
      if (prefs?.cart) {
        if (prefs.cart.showDiscount !== undefined) setShowDiscount(prefs.cart.showDiscount);
        if (prefs.cart.discountType) setDiscountType(prefs.cart.discountType);
        if (prefs.cart.discountValue !== undefined) setDiscountValue(String(prefs.cart.discountValue));
        const ro = (prefs as any)?.cart?.roundOff;
        if (typeof ro === 'boolean') setRoundOff(Boolean(ro));
      }
      prefsLoaded.current = true;
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!prefsLoaded.current) return;
    const payload = { 
      cart: { 
        showDiscount, 
        discountType, 
        discountValue: discountValue ? parseFloat(discountValue) : 0,
        roundOff
      } 
    } as any;
    saveUserPrefs(user?.id, payload);
  }, [showDiscount, discountType, discountValue, roundOff, user?.id]);

  // Cart operations
  const removeFromCart = (iid: string) => {
    onCartItemsChange(cartItems.filter((ci) => ci.id !== iid));
  };

  const clearCart = () => {
    onCartItemsChange([]);
  };

  // Market data for items in cart
  const cartGlobalAssetIds = useMemo(
    () => Array.from(new Set(cartItems.map((ci) => ci.item.globalAssetId).filter(Boolean))),
    [cartItems]
  );

  const { data: marketBatch = {} } = useQuery({
    queryKey: ["/api/pricing/batch", cartGlobalAssetIds],
    queryFn: async () => {
      if (!cartGlobalAssetIds.length) return {} as Record<string, any>;
      const results = await Promise.all(
        cartGlobalAssetIds.map(async (gaid: string) => {
          try {
            const res = await apiRequest("GET", `/api/pricing/${gaid}`);
            return { id: gaid, data: await res.json() };
          } catch {
            return { id: gaid, data: null };
          }
        })
      );
      return results.reduce((acc: any, { id, data }) => {
        acc[id] = data;
        return acc;
      }, {});
    },
    enabled: cartGlobalAssetIds.length > 0,
  });

  // Price edit functionality
  const handleEditPrice = (ci: CartItem) => {
    setEditingAssetId(ci.id);
    setEditingPrice(ci.price.toFixed(2));
    
    // Focus input after state update
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 100);
  };

  const handleSavePrice = async (ci: CartItem) => {
    const newPrice = parseFloat(editingPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      return;
    }

    // Show saving indicator
    setSaveIndicators(prev => ({ ...prev, [ci.id]: 'saving' }));
    
    try {
      // First update the inventory database so price persists when item is removed from cart
      await apiRequest("PATCH", `/api/events/${event.id}/inventory/${ci.id}`, { 
        askingPrice: newPrice 
      });
      
      // Then update cart item price locally
      onCartItemsChange(cartItems.map(item => 
        item.id === ci.id ? { ...item, price: newPrice } : item
      ));

      // Show saved indicator
      setTimeout(() => {
        setSaveIndicators(prev => ({ ...prev, [ci.id]: 'saved' }));
        setTimeout(() => {
          setSaveIndicators(prev => {
            const newState = { ...prev };
            delete newState[ci.id];
            return newState;
          });
        }, 2000);
      }, 500);
    } catch (error) {
      console.error('Failed to update price:', error);
      // Still update cart locally even if API fails
      onCartItemsChange(cartItems.map(item => 
        item.id === ci.id ? { ...item, price: newPrice } : item
      ));
      
      // Show error state briefly
      setSaveIndicators(prev => ({ ...prev, [ci.id]: 'saved' }));
      setTimeout(() => {
        setSaveIndicators(prev => {
          const newState = { ...prev };
          delete newState[ci.id];
          return newState;
        });
      }, 1000);
    }

    setEditingAssetId(null);
    setEditingPrice('');
  };

  const handleCancelEdit = () => {
    setEditingAssetId(null);
    setEditingPrice('');
  };

  const handleKeyPress = (e: React.KeyboardEvent, ci: CartItem) => {
    if (e.key === 'Enter') {
      handleSavePrice(ci);
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  // Handle asset click navigation
  const handleAssetClick = (asset: any) => {
    const assetId = asset.assetId || asset.id;
    const searchParams = new URLSearchParams();
    searchParams.set('from', 'event-cart');
    searchParams.set('eventId', event.id);
    
    const url = `/assets/${assetId}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Totals calculations
  const totalSell = useMemo(() => cartItems.reduce((s, ci) => s + (Number(ci.price) || 0), 0), [cartItems]);
  
  const totalMarket = useMemo(() => {
    return cartItems.reduce(
      (s, ci) => s + (Number(marketBatch?.[ci.item.globalAssetId]?.averagePrice || 0) || 0),
      0
    );
  }, [cartItems, marketBatch]);

  const discountAmount = useMemo(() => {
    if (!showDiscount || !discountValue) return 0;
    const value = parseFloat(discountValue);
    if (isNaN(value)) return 0;
    
    if (discountType === 'percent') {
      return (totalSell * value) / 100;
    }
    return Math.min(value, totalSell); // Can't discount more than total
  }, [showDiscount, discountType, discountValue, totalSell]);

  const discountedSell = totalSell - discountAmount;
  
  // Round up to the next multiple of $5 (no pennies at shows)
  const roundUpTo5 = (val: number) => {
    const safe = Number.isFinite(val) ? Math.max(0, val) : 0;
    // Convert to dollars rounded up to next 5-dollar increment
    return Math.ceil(safe / 5) * 5;
  };
  const finalSell = roundOff ? roundUpTo5(discountedSell) : discountedSell;
  
  const totalPurchase = useMemo(() => {
    return cartItems.reduce((s, ci) => {
      const purchase = Number(ci.item?.purchasePrice || 0) || 0;
      const avg = Number(marketBatch?.[ci.item.globalAssetId]?.averagePrice || 0) || 0;
      return s + (purchase > 0 ? purchase : avg);
    }, 0);
  }, [cartItems, marketBatch]);

  const discountedProfit = discountedSell - totalPurchase;
  const discountedProfitMargin = totalPurchase > 0 ? Math.round((discountedProfit / totalPurchase) * 100) : 0;

  // Publish totals to parent for checkout dialog sync (prevents discount flicker)
  useEffect(() => {
    onTotalsChange?.({
      totalSell,
      discountedSell,
      finalSell,
      totalMarket,
      totalPurchase,
      discountAmount,
      showDiscount,
      discountType,
      discountValue: discountValue ? parseFloat(discountValue) || 0 : 0,
    });
  }, [
    totalSell,
    discountedSell,
    finalSell,
    totalMarket,
    totalPurchase,
    discountAmount,
    showDiscount,
    discountType,
    discountValue,
    onTotalsChange,
  ]);

  const renderCartItems = () => {
    if (cartItems.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No items in cart. Add items from inventory.
        </div>
      );
    }

    return cartItems.map((ci, index) => {
      const avg = Number(marketBatch?.[ci.item.globalAssetId]?.averagePrice || 0) || 0;
      const sell = Number(ci.price || 0) || 0;
      const purchase = Number(ci.item?.purchasePrice || 0) || 0;
      const basis = purchase > 0 ? purchase : avg;
      const profit = sell - (basis || 0);
      const pctOfComp = avg > 0 ? Math.round((sell / avg) * 100) : null;
      const profitMargin = basis > 0 ? Math.round((profit / basis) * 100) : 0;

      return (
        <div
          key={`${ci.id}-${index}`}
          className="w-full border-b p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="w-full flex items-start gap-3">
            {/* Slab-proportioned thumbnail */}
            <div className="w-16 h-full bg-accent rounded border flex-shrink-0 flex items-center justify-center overflow-hidden">
              {ci.item.psaImageFrontUrl ? (
                <img
                  src={ci.item.psaImageFrontUrl}
                  alt="Card"
                  className="w-24 object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-primary to-primary/80 rounded flex flex-col items-center justify-center text-primary-foreground text-xs">
                  <div className="text-center">
                    <div className="font-bold">CARD</div>
                    <div className="font-bold">IMAGE</div>
                    <div className="mt-1 text-xs opacity-75">
                      PSA {ci.item.grade}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content area */}
            <div className="flex-1 pt-2 min-w-0 w-full flex justify-between items-start">
              {/* Left side - Card info (match Portfolio asset text & order) */}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium tracking-wide uppercase text-muted-foreground leading-tight truncate">
                  {ci.item.year} {ci.item.setName}
                </div>
                <button 
                  onClick={() => handleAssetClick(ci.item)} 
                  className="font-semibold text-sm leading-tight truncate text-foreground cursor-pointer flex items-center gap-1 group"
                >
                  <span className="truncate">{ci.item.playerName}</span>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
                <div className="text-xs text-foreground leading-tight">
                  #{ci.item.cardNumber} • {ci.item.grader ? `${ci.item.grader} ${ci.item.grade || ''}` : (ci.item.grade || '').trim()}
                </div>
                {ci.item.certNumber && (
                  <div className="text-xs text-muted-foreground leading-tight">Cert# {ci.item.certNumber}</div>
                )}

                {/* Remove link below card info */}
                <button
                  onClick={() => removeFromCart(ci.id)}
                  className="text-xs text-muted-foreground hover:text-foreground mt-2 cursor-pointer"
                >
                  Remove
                </button>
              </div>

              {/* Right side - Sell Price & Profit */}
              <div className="flex flex-col items-end text-right">
                <div className="text-xs text-muted-foreground mb-1">Sell Price</div>
                {editingAssetId === ci.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={editInputRef}
                      type="number"
                      step="0.01"
                      min="0"
                      value={editingPrice}
                      onChange={(e) => setEditingPrice(e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, ci)}
                      onBlur={() => handleSavePrice(ci)}
                      className="w-20 h-8 text-sm text-right"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                      className="h-6 w-6 p-0"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="font-bold text-foreground text-lg">
                      ${typeof sell === 'number' && !isNaN(sell) ? sell.toFixed(2) : '0.00'}
                    </div>
                    {saveIndicators[ci.id] === 'saving' && (
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-muted-foreground"></div>
                    )}
                    {saveIndicators[ci.id] === 'saved' && (
                      <Check className="h-3 w-3 text-success" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPrice(ci)}
                      className="h-6 w-6 p-0 hover:bg-muted"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                
                <div className="text-sm flex items-center gap-2 mt-2">
                  <div className="text-xs text-muted-foreground">
                    {(typeof pctOfComp === 'number' && !isNaN(pctOfComp) ? pctOfComp : 0)}% • Profit:
                  </div>
                  <Badge
                    variant="secondary"
                    className={(profitMargin ?? 0) < 0 ? "bg-destructive/10 text-destructive border-destructive" : "bg-success/10 text-success border-success"}
                  >
                    {profitMargin}%
                  </Badge>
                  <span className="font-medium text-foreground">
                    ${typeof profit === 'number' && !isNaN(profit) ? profit.toFixed(2) : '0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  const renderMobileCartItems = () => {
    if (cartItems.length === 0) {
      return <div className="text-sm text-muted-foreground py-10 text-center">No items in cart.</div>;
    }

    return (
      <div className="space-y-3">
        {cartItems.map((ci) => {
          const title = ci.item?.playerName || "Unknown";
          const subtitle = `${ci.item?.year ?? ""} ${ci.item?.setName ?? ""} • #${ci.item?.cardNumber ?? ""} • PSA ${
            ci.item?.grade ?? ""
          }`.trim();
          
          return (
            <div key={ci.id} className="flex items-start gap-3 bg-card p-3 rounded-lg">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{title}</div>
                <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
                <div className="text-lg font-semibold">${Number(ci.price || 0).toFixed(2)}</div>
                <Button variant="link" className="px-0 text-xs text-muted-foreground" onClick={() => removeFromCart(ci.id)}>
                  Remove
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDesktopCart = () => (
    <div ref={desktopAreaRef} className="flex-1 min-h-0 min-w-0 flex">
      {cartOpen ? (
        <div className="hidden lg:flex flex-1 min-h-0 min-w-0">
          <ResizablePanelGroup
            direction="horizontal"
            className="flex-1"
            autoSaveId={`event-cart-split:${event.id}`}
          >
            <ResizablePanel defaultSize={Math.max(0, 100 - cartDefaultPercent)} minSize={30}>
              {children}
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={cartDefaultPercent} minSize={18}>
              {/* BuyListCart-style layout */}
              <div className="bg-background border-l h-full min-h-0 flex flex-col">
                <div className="p-6 border-b flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-m font-semibold text-muted-foreground">
                      Cart ({cartItems.length})
                    </h3>
                    <Button variant="ghost" size="icon" onClick={() => onCartOpenChange(false)} aria-label="Close cart">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  <div className="w-full">
                    {renderCartItems()}
                  </div>
                </div>

                {/* Fixed Summary Section at Bottom - Match BuyListCart exactly */}
                {cartItems.length > 0 && (
                  <div className="border-t p-6 flex-shrink-0 sticky bottom-0 z-10 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur mt-auto">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Items</span>
                        <span className="font-medium text-foreground">
                          {cartItems.length}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Market Value</span>
                        <span className="font-medium text-foreground">
                          ${totalMarket.toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Discount row - match BuyListCart layout */}
                      <div className="flex justify-between text-sm items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">Discount</span>
                          {showDiscount && (
                            <>
                              <div className="h-4 w-px bg-border mx-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setShowDiscount(false);
                                  setDiscountValue('');
                                  setDiscountType('percent');
                                }}
                                className="text-destructive hover:underline text-md"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                        {!showDiscount ? (
                          <button
                            type="button"
                            onClick={() => setShowDiscount(true)}
                            className="text-primary hover:underline text-md text-right"
                          >
                            + Add Discount
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 justify-end">
                            {/* Type toggle */}
                            <div className="flex items-center rounded-md border bg-card overflow-hidden">
                              <button
                                type="button"
                                className={`px-2 py-1 text-xs ${discountType === 'percent' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}
                                onClick={() => setDiscountType('percent')}
                                aria-pressed={discountType === 'percent'}
                              >
                                %
                              </button>
                              <button
                                type="button"
                                className={`px-2 py-1 text-xs border-l ${discountType === 'amount' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}
                                onClick={() => setDiscountType('amount')}
                                aria-pressed={discountType === 'amount'}
                              >
                                $
                              </button>
                            </div>
                            {/* Value input */}
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.01"
                              min="0"
                              placeholder={discountType === 'percent' ? '0' : '0.00'}
                              value={discountValue}
                              onChange={(e) => setDiscountValue(e.target.value)}
                              className="h-8 w-24 text-sm text-right"
                            />
                            {discountType === 'percent' ? (
                              <span className="text-xs text-muted-foreground">%</span>
                            ) : null}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Expected Profit</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            ${discountedProfit.toFixed(2)}
                          </span>
                          <Badge 
                            variant="secondary" 
                            className={discountedProfitMargin < 0 
                              ? "bg-destructive/10 text-destructive border-destructive"
                              : "bg-success/10 text-success border-success"
                            }
                          >
                            {discountedProfitMargin}%
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-between font-semibold text-lg border-t pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">Total Sell Price</span>
                          <button
                            type="button"
                            onClick={() => setRoundOff((r) => !r)}
                            className="text-primary text-xs font-normal hover:underline"
                          >
                            {roundOff ? "Use Exact Total" : "+ Round Off"}
                          </button>
                        </div>
                        <span className="text-foreground">
                          ${finalSell.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <Button 
                        className="w-full" 
                        onClick={onCheckout} 
                        disabled={cartItems.length === 0}
                      >
                        Checkout
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={onReserve}
                        disabled={cartItems.length === 0}
                      >
                        Reserve
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        children
      )}
    </div>
  );

  const renderMobileCart = () => {
    if (!cartOpen) return null;

    return (
      <div className="lg:hidden fixed inset-0 bg-black/20 z-50">
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background shadow-xl flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-foreground" />
              <span className="font-semibold">Cart ({cartItems.length})</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onCartOpenChange(false)} aria-label="Close cart">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {renderMobileCartItems()}
          </div>
          <div className="border-t p-4 sticky bottom-0 z-10 bg-background/95 supports-[backdrop-filter]:bg-background/80 backdrop-blur">
            <div className="flex items-center justify-between font-semibold text-lg mb-3">
              <div className="flex items-center gap-2">
                <span>Total</span>
                <button
                  type="button"
                  onClick={() => setRoundOff((r) => !r)}
                  className="text-primary text-sm font-normal hover:underline"
                >
                  {roundOff ? "Use Exact Total" : "+ Round Off"}
                </button>
              </div>
              <span>${finalSell.toFixed(2)}</span>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={onCheckout} disabled={cartItems.length === 0}>
                Checkout
              </Button>
              <Button variant="outline" className="w-full" onClick={onReserve} disabled={cartItems.length === 0}>
                Reserve
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {renderDesktopCart()}
      {renderMobileCart()}
    </>
  );
}