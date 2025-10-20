// 🤖 INTERNAL NOTE:
// Purpose: Route wrapper for checkout that provides cart context and required props
// Exports: StorefrontCheckoutRoute component
// Feature: show-storefront/public/checkout

import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { StorefrontCheckout } from "./storefront-checkout";
import { useCart } from "../../hooks/use-cart";
import { CartProvider } from "../../hooks/use-cart";
import type { StorefrontSettings } from "@shared/schema";
import { Loader2 } from "lucide-react";

function CheckoutWithCart() {
  const { userId } = useParams<{ userId: string }>();
  const { cart } = useCart();

  // Fetch storefront settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["storefront-public", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/storefront/settings/user/${userId}`);
      return await response.json() as StorefrontSettings;
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Invalid storefront URL</p>
      </div>
    );
  }

  return (
    <StorefrontCheckout
      userId={userId}
      cartItems={cart?.items.map(item => ({
        id: item.asset.id,
        asset: item.asset,
        price: item.price || 0,
        eventId: item.eventId,
        eventInventoryId: item.eventInventoryId,
      })) || []}
      settings={settings || null}
    />
  );
}

export function StorefrontCheckoutRoute() {
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
      <CheckoutWithCart />
    </CartProvider>
  );
}
