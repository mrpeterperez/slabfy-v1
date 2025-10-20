// 🤖 INTERNAL NOTE:
// Purpose: Floating cart button with item count badge
// Exports: CartButton component
// Feature: show-storefront/public/cart
// Dependencies: useCart hook, wouter Link, ShadCN Button, Badge

import { ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "../../hooks/use-cart";

interface CartButtonProps {
  userId: string;
  primaryColor: string;
}

export function CartButton({ userId, primaryColor }: CartButtonProps) {
  const { cart } = useCart();
  const itemCount = cart?.items.length || 0;

  if (itemCount === 0) return null;

  return (
    <Link href={`/storefront/${userId}/cart`}>
      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full shadow-lg h-16 w-16 z-50"
        style={{ backgroundColor: primaryColor }}
      >
        <div className="relative">
          <ShoppingCart className="h-6 w-6" />
          {itemCount > 0 && (
            <Badge
              variant="secondary"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
            >
              {itemCount}
            </Badge>
          )}
        </div>
      </Button>
    </Link>
  );
}
