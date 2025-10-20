// 🤖 INTERNAL NOTE:
// Purpose: TypeScript types for cart and checkout system
// Exports: CartItem, Cart, CustomerInfo, CartContextType
// Feature: show-storefront/public/cart
// Dependencies: @shared/schema Asset type

import type { Asset } from "@shared/schema";

export interface CartItem {
  asset: Asset;
  addedAt: Date;
  holdExpiresAt: Date;
  price?: number; // Item price
  eventId?: string; // For event-based storefronts
  eventInventoryId?: string; // References event_inventory record
}

export interface Cart {
  items: CartItem[];
  userId: string;
  createdAt: Date;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

export interface CartContextType {
  cart: Cart | null;
  addToCart: (asset: Asset, holdMinutes: number) => void;
  removeFromCart: (assetId: string) => void;
  clearCart: () => void;
  getTimeRemaining: (assetId: string) => number | null;
  isInCart: (assetId: string) => boolean;
}
