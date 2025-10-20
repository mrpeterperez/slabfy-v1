// 🤖 INTERNAL NOTE:
// Purpose: Wrapper component that provides CartProvider to storefront routes
// Exports: StorefrontWithCart (HOC wrapper)
// Feature: show-storefront (public)
// Dependencies: CartProvider, useParams (wouter)

import { useParams } from "wouter";
import { CartProvider } from "../../hooks/use-cart";
import type { ReactNode } from "react";

interface StorefrontWithCartProps {
  children: ReactNode;
}

/**
 * Higher-order component that wraps storefront routes with CartProvider
 * Extracts userId from route params and provides cart context to children
 */
export function StorefrontWithCart({ children }: StorefrontWithCartProps) {
  const { userId } = useParams<{ userId: string }>();
  
  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Invalid storefront URL</p>
      </div>
    );
  }

  return (
    <CartProvider userId={userId}>
      {children}
    </CartProvider>
  );
}
