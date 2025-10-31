// 🤖 INTERNAL NOTE:
// Purpose: React Context provider for cart state management with localStorage persistence
// Exports: CartProvider component, useCart hook
// Feature: show-storefront/public/cart
// Dependencies: React Context, cart types, localStorage

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import type { Asset } from "@shared/schema";
import type { Cart, CartItem, CartContextType } from "../types/cart";

const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
  userId: string;
}

export function CartProvider({ children, userId }: CartProviderProps) {
  const [cart, setCart] = useState<Cart | null>(null);

  // Load cart from localStorage on mount
  useEffect(() => {
    const storageKey = `slabfy_cart_${userId}`;
    const savedCart = localStorage.getItem(storageKey);
    
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        // Convert date strings back to Date objects
        const cartWithDates: Cart = {
          ...parsed,
          createdAt: new Date(parsed.createdAt),
          items: parsed.items.map((item: any) => ({
            ...item,
            addedAt: new Date(item.addedAt),
            holdExpiresAt: new Date(item.holdExpiresAt),
          })),
        };
        
        // Remove expired items
        const now = Date.now();
        const validItems = cartWithDates.items.filter(
          (item) => item.holdExpiresAt.getTime() > now
        );
        
        if (validItems.length > 0) {
          setCart({ ...cartWithDates, items: validItems });
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [userId]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart) {
      const storageKey = `slabfy_cart_${userId}`;
      localStorage.setItem(storageKey, JSON.stringify(cart));
    }
  }, [cart, userId]);

  // Auto-remove expired items every 30 seconds (not every second - too aggressive)
  useEffect(() => {
    if (!cart || cart.items.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const validItems = cart.items.filter(
        (item) => item.holdExpiresAt.getTime() > now
      );

      if (validItems.length !== cart.items.length) {
        if (validItems.length === 0) {
          clearCart();
        } else {
          setCart({ ...cart, items: validItems });
        }
      }
    }, 30000); // 30 seconds (was 1 second - way too aggressive) // Check every second

    return () => clearInterval(interval);
  }, [cart]);

  const addToCart = (asset: Asset, holdMinutes: number) => {
    const now = new Date();
    const holdExpiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);

    const newItem: CartItem = {
      asset,
      addedAt: now,
      holdExpiresAt,
    };

    if (!cart) {
      setCart({
        items: [newItem],
        userId,
        createdAt: now,
      });
    } else {
      // Check if already in cart
      const exists = cart.items.some((item) => item.asset.id === asset.id);
      if (!exists) {
        setCart({
          ...cart,
          items: [...cart.items, newItem],
        });
      }
    }
  };

  const removeFromCart = (assetId: string) => {
    if (!cart) return;

    const newItems = cart.items.filter((item) => item.asset.id !== assetId);
    
    if (newItems.length === 0) {
      clearCart();
    } else {
      setCart({ ...cart, items: newItems });
    }
  };

  const clearCart = () => {
    const storageKey = `slabfy_cart_${userId}`;
    localStorage.removeItem(storageKey);
    setCart(null);
  };

  const getTimeRemaining = (assetId: string): number | null => {
    if (!cart) return null;

    const item = cart.items.find((item) => item.asset.id === assetId);
    if (!item) return null;

    const remaining = item.holdExpiresAt.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  };

  const isInCart = (assetId: string): boolean => {
    if (!cart) return false;
    return cart.items.some((item) => item.asset.id === assetId);
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
        getTimeRemaining,
        isInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
