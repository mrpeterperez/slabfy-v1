// 🤖 INTERNAL NOTE:
// Purpose: Public event storefront page - full-screen, no dashboard
// Exports: PublicEventStorefront component
// Feature: sales-channels/show-storefront/public
// Dependencies: wouter, react-query, cart provider

import { useParams } from "wouter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";
import { StorefrontHomeTab } from "./storefront-home-tab";
import { StorefrontInventoryTab } from "./storefront-inventory-tab";
import { StorefrontCheckout } from "./storefront-checkout";
import { CartProvider, useCart } from "../../hooks/use-cart";
import type { StorefrontSettings, Event } from "@shared/schema";

type Tab = "home" | "inventory" | "checkout";

export function PublicEventStorefront() {
  const { username, eventSlug } = useParams<{ username: string; eventSlug: string }>();
  const [activeTab, setActiveTab] = useState<Tab>("home");

  // Fetch user by username
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["public-user", username],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/public/user/@${username}`);
      if (!response.ok) throw new Error("User not found");
      return await response.json();
    },
    enabled: !!username,
  });

  // Fetch event by slug
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["public-event", user?.id, eventSlug],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/public/events/${user.id}/${eventSlug}`);
      if (!response.ok) throw new Error("Event not found");
      return await response.json() as Event;
    },
    enabled: !!user?.id && !!eventSlug,
  });

  // Fetch storefront settings for this event
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["public-event-storefront", event?.id],
    queryFn: async () => {
      if (!event?.id || !user?.id) return null;
      const response = await apiRequest("GET", `/api/storefront/settings/event/${event.id}`);
      if (!response.ok) {
        // Fallback to user's default settings if no event-specific settings
        const fallbackResponse = await apiRequest("GET", `/api/storefront/settings/user/${user.id}`);
        return await fallbackResponse.json() as StorefrontSettings;
      }
      return await response.json() as StorefrontSettings;
    },
    enabled: !!event?.id && !!user?.id,
  });

  const isLoading = userLoading || eventLoading || settingsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !event || !settings) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Storefront Not Found</h1>
          <p className="text-muted-foreground">
            This event storefront is not available or has been disabled.
          </p>
        </div>
      </div>
    );
  }

  const publicUrl = `${window.location.origin}/@${username}/${eventSlug}`;

  return (
    <CartProvider userId={user.id}>
      <div className="min-h-screen bg-background">
        {/* Tab Navigation - Only show if not on home */}
        {activeTab !== "home" && (
          <div className="sticky top-0 z-50 bg-background border-b">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab("inventory")}
                  className={`py-4 px-2 border-b-2 transition-colors ${
                    activeTab === "inventory"
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Inventory
                </button>
                <button
                  onClick={() => setActiveTab("checkout")}
                  className={`py-4 px-2 border-b-2 transition-colors ${
                    activeTab === "checkout"
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "home" && (
          <StorefrontHomeTab 
            settings={settings} 
            userId={user.id}
            onNavigateToInventory={() => setActiveTab("inventory")}
          />
        )}
        {activeTab === "inventory" && (
          <StorefrontInventoryTab 
            settings={settings} 
            assets={[]}
            isLoading={false}
            userId={user.id}
            onNavigateHome={() => setActiveTab("home")}
          />
        )}
        {activeTab === "checkout" && (
          <CheckoutWithCart settings={settings} userId={user.id} />
        )}
      </div>
    </CartProvider>
  );
}

// Inner component that accesses cart context
function CheckoutWithCart({ 
  settings, 
  userId 
}: { 
  settings: StorefrontSettings; 
  userId: string;
}) {
  const { cart } = useCart();
  
  // Map cart items to StorefrontCartItem format
  const cartItems = cart?.items.map(item => ({
    id: item.asset.id,
    asset: item.asset,
    price: item.price || 0,
    eventId: item.eventId,
    eventInventoryId: item.eventInventoryId
  })) || [];

  return (
    <StorefrontCheckout 
      settings={settings} 
      userId={userId}
      cartItems={cartItems}
    />
  );
}
