// 🤖 INTERNAL NOTE:
// Purpose: Mobile-only cart component for event checkout
// Exports: EventCartMobile component
// Feature: events

import { ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CartItem } from "./event-cart";
import type { Event } from "shared/schema";

interface EventCartMobileProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  totalMarket: number;
  discountedProfit: number;
  discountedProfitMargin: number;
  finalSell: number;
  showDiscount: boolean;
  discountType: 'percent' | 'amount';
  discountValue: string;
  roundOff: boolean;
  onShowDiscountChange: (show: boolean) => void;
  onDiscountTypeChange: (type: 'percent' | 'amount') => void;
  onDiscountValueChange: (value: string) => void;
  onRoundOffToggle: () => void;
  onCheckout: () => void;
  onReserve: () => void;
  renderCartItems: () => React.ReactNode;
}

export function EventCartMobile({
  isOpen,
  onClose,
  cartItems,
  totalMarket,
  discountedProfit,
  discountedProfitMargin,
  finalSell,
  showDiscount,
  discountType,
  discountValue,
  roundOff,
  onShowDiscountChange,
  onDiscountTypeChange,
  onDiscountValueChange,
  onRoundOffToggle,
  onCheckout,
  onReserve,
  renderCartItems,
}: EventCartMobileProps) {
  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 bg-background z-[100] flex flex-col">
      {/* Header - Match mobile header height (h-16) */}
      <div className="h-16 border-b flex-shrink-0 flex items-center justify-between px-4">
        <h3 className="text-xl font-bold">Cart ({cartItems.length})</h3>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close cart">
          <X className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Scrollable Cart Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full">
          {renderCartItems()}
        </div>
      </div>

      {/* Fixed Summary Section at Bottom - Collapsible */}
      {cartItems.length > 0 && (
        <div className="border-t flex-shrink-0 bg-background">
          <details className="group">
            <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className="font-bold text-lg">${finalSell.toFixed(2)}</span>
                </div>
              </div>
              <svg className="w-5 h-5 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            
            <div className="px-4 pb-4 space-y-3 border-t pt-4">
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
                          onShowDiscountChange(false);
                          onDiscountValueChange('');
                          onDiscountTypeChange('percent');
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
                    onClick={() => onShowDiscountChange(true)}
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
                        onClick={() => onDiscountTypeChange('percent')}
                        aria-pressed={discountType === 'percent'}
                      >
                        %
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 text-xs border-l ${discountType === 'amount' ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}
                        onClick={() => onDiscountTypeChange('amount')}
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
                      onChange={(e) => onDiscountValueChange(e.target.value)}
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
              
              <div className="flex justify-between text-sm border-t pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Total Sell Price</span>
                  <button
                    type="button"
                    onClick={onRoundOffToggle}
                    className="text-primary text-xs font-normal hover:underline"
                  >
                    {roundOff ? "Use Exact" : "+ Round"}
                  </button>
                </div>
                <span className="font-semibold">
                  ${finalSell.toFixed(2)}
                </span>
              </div>
            </div>
          </details>
          
          <div className="p-4 space-y-2 border-t">
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
  );
}
