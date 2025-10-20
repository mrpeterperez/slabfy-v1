// 🤖 INTERNAL NOTE:
// Purpose: Cart review page showing held items with countdown timers
// Exports: StorefrontCart component
// Feature: show-storefront/public/cart
// Dependencies: useCart hook, useParams, React Query, ShadCN components

import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { useCart } from "../../hooks/use-cart";
import type { StorefrontSettings } from "../../types";

export function StorefrontCart() {
  const { userId } = useParams<{ userId: string }>();
  const { cart, removeFromCart, getTimeRemaining } = useCart();
  const [now, setNow] = useState(Date.now());

  // Update time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch storefront settings for branding
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["storefront-settings", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/storefront/settings/user/${userId}`);
      return response.json() as Promise<StorefrontSettings>;
    },
  });

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Storefront not found</p>
      </div>
    );
  }

  const primaryColor = settings.primaryColor || "#000000";

  const formatTimeRemaining = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div
        className="py-8 px-4"
        style={{
          background: `linear-gradient(135deg, ${primaryColor} 0%, ${settings.accentColor || "#666666"} 100%)`,
        }}
      >
        <div className="max-w-4xl mx-auto">
          <Link href={`/storefront/${userId}/inventory`}>
            <Button variant="ghost" className="text-white hover:bg-white/20 mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-white">Your Cart</h1>
          <p className="text-white/90 mt-1">Review your held items</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {!cart || cart.items.length === 0 ? (
          <Card className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">
              Add items from the inventory to get started
            </p>
            <Link href={`/storefront/${userId}/inventory`}>
              <Button style={{ backgroundColor: primaryColor }}>
                Browse Inventory
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="md:col-span-2 space-y-4">
              {cart.items.map((item) => {
                const timeRemaining = getTimeRemaining(item.asset.id) || 0;
                const isExpiring = timeRemaining < 5 * 60 * 1000; // Less than 5 minutes

                return (
                  <Card key={item.asset.id} className="p-4">
                    <div className="flex gap-4">
                      {/* Thumbnail */}
                      <div className="w-24 h-32 bg-muted rounded flex-shrink-0">
                        {item.asset.psaImageFrontUrl || item.asset.assetImages?.[0] ? (
                          <img
                            src={item.asset.psaImageFrontUrl || item.asset.assetImages?.[0] || ""}
                            alt={item.asset.playerName || "Card"}
                            className="w-full h-full object-contain rounded"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                            No Image
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">
                          {item.asset.playerName || "Unknown Player"}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {item.asset.year} {item.asset.setName} #{item.asset.cardNumber}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">
                            {item.asset.grader} {item.asset.grade}
                          </Badge>
                          {item.asset.category && (
                            <Badge variant="outline">{item.asset.category}</Badge>
                          )}
                        </div>

                        {/* Hold Timer */}
                        <div className={`flex items-center gap-2 mt-3 ${isExpiring ? "text-destructive" : "text-muted-foreground"}`}>
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Hold expires in: {formatTimeRemaining(timeRemaining)}
                          </span>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.asset.id)}
                        className="flex-shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Summary Sidebar */}
            <div className="md:col-span-1">
              <Card className="p-6 sticky top-6">
                <h3 className="font-semibold text-lg mb-4">Cart Summary</h3>
                
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Items:</span>
                    <span className="font-semibold">{cart.items.length}</span>
                  </div>
                  
                  {settings.defaultHoldMinutes && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hold Duration:</span>
                      <span className="font-semibold">{settings.defaultHoldMinutes} min</span>
                    </div>
                  )}
                </div>

                <Separator className="my-4" />

                <Link href={`/storefront/${userId}/checkout`}>
                  <Button
                    className="w-full"
                    size="lg"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>

                <Link href={`/storefront/${userId}/inventory`}>
                  <Button variant="outline" className="w-full mt-3">
                    Continue Shopping
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t py-6 mt-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          Powered by <span className="font-semibold">Slabfy</span>
        </div>
      </div>
    </div>
  );
}
