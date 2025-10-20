// 🤖 INTERNAL NOTE:
// Purpose: Storefront cart side panel - matches EventCart UI exactly
// Exports: StorefrontCartPanel component
// Feature: sales-channels/show-storefront

import { useEffect, useState } from "react";
import { ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/constants";
import type { Asset, StorefrontSettings } from "@shared/schema";

export interface StorefrontCartItem {
  id: string;
  asset: Asset;
  price: number;
  eventId?: string; // For event-based storefronts
  eventInventoryId?: string; // References event_inventory record
}

interface StorefrontCartPanelProps {
  settings: Partial<StorefrontSettings> | null;
  cartOpen: boolean;
  onCartOpenChange: (open: boolean) => void;
  cartItems: StorefrontCartItem[];
  onCartItemsChange: (items: StorefrontCartItem[]) => void;
  onCheckout: () => void;
  userId?: string;
}

export function StorefrontCartPanel({
  settings,
  cartOpen,
  onCartOpenChange,
  cartItems,
  onCartItemsChange,
  onCheckout,
  userId,
}: StorefrontCartPanelProps) {
  const primaryColor = settings?.primaryColor || '#0d9488';
  const headingFont = settings?.headingFont || 'Inter';
  const fontStyle = settings?.fontStyle || 'Inter';

  // Cart persistence
  const [cartHydrated, setCartHydrated] = useState(false);
  
  useEffect(() => {
    if (cartHydrated || !userId) return;
    try {
      const stored = localStorage.getItem(`storefrontCart:${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) onCartItemsChange(parsed);
      }
    } catch {}
    setCartHydrated(true);
  }, [userId, onCartItemsChange, cartHydrated]);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(`storefrontCart:${userId}`, JSON.stringify(cartItems));
    } catch {}
  }, [cartItems, userId]);

  // Cart operations
  const removeFromCart = (assetId: string) => {
    onCartItemsChange(cartItems.filter((ci) => ci.id !== assetId));
  };

  const clearCart = () => {
    onCartItemsChange([]);
  };

  // Totals
  const totalItems = cartItems.length;
  const totalPrice = cartItems.reduce((sum, ci) => sum + ci.price, 0);

  const renderCartItems = () => {
    if (cartItems.length === 0) {
      return (
        <div className="text-center py-12 px-4">
          <div className="mb-3">
            <ShoppingCart className="h-12 w-12 mx-auto text-gray-300" />
          </div>
          <p className="text-gray-500 text-sm" style={{ fontFamily: fontStyle }}>
            No items in cart.
          </p>
          <p className="text-gray-400 text-xs mt-1" style={{ fontFamily: fontStyle }}>
            Add items from inventory.
          </p>
        </div>
      );
    }

    return cartItems.map((ci) => (
      <div
        key={ci.id}
        className="w-full border-b p-6 pb-4 pt-4 hover:bg-gray-50 transition-colors"
      >
        <div className="w-full flex flex-col gap-2">
          {/* Thumbnail - smaller but FULL slab visible */}
          <div className="w-full aspect-[2/3] bg-gray-100 rounded border flex items-center justify-center overflow-hidden">
            {ci.asset.psaImageFrontUrl ? (
              <img
                src={ci.asset.psaImageFrontUrl}
                alt="Card"
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={PLACEHOLDER_IMAGE_URL}
                alt="Card"
                className="w-full h-full object-contain"
              />
            )}
          </div>

          {/* Card info - stacked below image */}
          <div className="w-full">
            <div 
              className="text-xs font-medium tracking-wide uppercase text-gray-500 leading-tight truncate"
              style={{ fontFamily: fontStyle }}
            >
              {ci.asset.year} {ci.asset.setName}
            </div>
            <div 
              className="font-semibold text-sm leading-tight truncate text-gray-900 mt-1"
              style={{ fontFamily: headingFont }}
            >
              {ci.asset.playerName}
            </div>
            <div 
              className="text-xs text-gray-600 leading-tight mt-1"
              style={{ fontFamily: fontStyle }}
            >
              #{ci.asset.cardNumber} • {ci.asset.grade || ''}
            </div>

            {/* Price */}
            <div className="mt-2">
              <div 
                className="font-bold text-gray-900 text-base"
                style={{ fontFamily: headingFont }}
              >
                ${ci.price.toFixed(2)}
              </div>
            </div>

            {/* Remove button */}
            <button
              onClick={() => removeFromCart(ci.id)}
              className="text-xs text-gray-500 hover:text-gray-900 mt-1"
              style={{ fontFamily: fontStyle }}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    ));
  };

  if (!cartOpen) return null;

  return (
    <>
      {/* Desktop cart - persistent sidebar (NO overlay, pushes content) */}
      <div className="hidden md:flex h-full flex-col bg-white">
        {/* Header */}
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 
              className="text-lg font-semibold text-gray-600"
              style={{ fontFamily: headingFont }}
            >
              Cart ({totalItems})
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCartOpenChange(false)}
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {renderCartItems()}
        </div>

        {/* Summary */}
        {cartItems.length > 0 && (
          <div className="border-t p-6 flex-shrink-0 bg-white">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span 
                  className="text-gray-600"
                  style={{ fontFamily: fontStyle }}
                >
                  Total Items
                </span>
                <span 
                  className="font-medium text-gray-900"
                  style={{ fontFamily: fontStyle }}
                >
                  {totalItems}
                </span>
              </div>
              
              <div className="flex justify-between font-semibold text-lg border-t pt-3">
                <span 
                  className="text-gray-900"
                  style={{ fontFamily: headingFont }}
                >
                  Total
                </span>
                <span 
                  className="text-gray-900"
                  style={{ fontFamily: headingFont }}
                >
                  ${totalPrice.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={onCheckout}
                disabled={cartItems.length === 0}
                className="w-full py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: `${settings?.buttonRadius || 16}px`,
                  fontFamily: headingFont,
                  border: 'none',
                  cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Checkout
              </button>
              
              <button
                onClick={clearCart}
                disabled={cartItems.length === 0}
                className="w-full py-3 text-base font-bold border-2 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  borderRadius: `${settings?.buttonRadius || 16}px`,
                  color: primaryColor,
                  borderColor: primaryColor,
                  backgroundColor: 'transparent',
                  fontFamily: headingFont,
                  cursor: cartItems.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Clear Cart
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile cart - full screen from right (keeps overlay for mobile) */}
      <div className="md:hidden fixed inset-0 bg-black/20 z-50">
        <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-gray-900" />
              <span 
                className="font-semibold"
                style={{ fontFamily: headingFont }}
              >
                Cart ({totalItems})
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onCartOpenChange(false)}
              aria-label="Close cart"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-auto">
            {renderCartItems()}
          </div>

          {/* Summary */}
          {cartItems.length > 0 && (
            <div className="border-t p-4 bg-white">
              <div className="flex items-center justify-between font-semibold text-lg mb-3">
                <span style={{ fontFamily: headingFont }}>Total</span>
                <span style={{ fontFamily: headingFont }}>${totalPrice.toFixed(2)}</span>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={onCheckout}
                  disabled={cartItems.length === 0}
                  className="w-full py-3 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{
                    backgroundColor: primaryColor,
                    borderRadius: `${settings?.buttonRadius || 16}px`,
                    fontFamily: headingFont,
                    border: 'none',
                  }}
                >
                  Checkout
                </button>
                
                <button
                  onClick={clearCart}
                  disabled={cartItems.length === 0}
                  className="w-full py-3 text-base font-bold border-2 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  style={{
                    borderRadius: `${settings?.buttonRadius || 16}px`,
                    color: primaryColor,
                    borderColor: primaryColor,
                    backgroundColor: 'transparent',
                    fontFamily: headingFont,
                  }}
                >
                  Clear Cart
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Mobile backdrop */}
        <div
          className="absolute inset-0 -z-10"
          onClick={() => onCartOpenChange(false)}
        />
      </div>
    </>
  );
}
