// 🤖 INTERNAL NOTE:
// Purpose: Checkout wrapper - uses new CheckoutPage component
// Exports: StorefrontCheckout component
// Feature: show-storefront/public/checkout

import { CheckoutPage } from "./checkout/checkout-page";
import type { StorefrontSettings } from "@shared/schema";
import type { StorefrontCartItem } from "./storefront-cart-panel";

interface StorefrontCheckoutProps {
  userId: string;
  eventId?: string;
  cartItems: StorefrontCartItem[];
  settings: Partial<StorefrontSettings> | null;
  onBack?: () => void;
}

export function StorefrontCheckout({ userId, eventId, cartItems, settings, onBack }: StorefrontCheckoutProps) {
  return (
    <CheckoutPage
      settings={settings}
      cartItems={cartItems}
      onBack={onBack || (() => window.history.back())}
      userId={userId}
    />
  );
}
