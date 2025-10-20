// 🤖 INTERNAL NOTE:
// Purpose: Full-screen order review dialog for dealer to review customer orders
// Exports: OrderReviewDialog component
// Feature: events/orders
// Dependencies: EventOrder type from hooks, Dialog components

import { X, User, Mail, Phone, ShoppingBag, CheckCircle2, RotateCcw, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { PLACEHOLDER_IMAGE_URL } from "@/lib/constants";
import type { EventOrder } from "../../hooks/use-event-orders";
import { format } from "date-fns";

interface OrderReviewDialogProps {
  order: EventOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (order: EventOrder) => void;
  onPass: (order: EventOrder) => void;
  onCounter?: (order: EventOrder) => void;
  onProceedToCheckout?: (order: EventOrder) => void;
  onUndoConfirm?: (order: EventOrder) => void;
  onReopenCancelled?: (order: EventOrder) => void;
}

export function OrderReviewDialog({
  order,
  isOpen,
  onClose,
  onAccept,
  onPass,
  onCounter,
  onProceedToCheckout,
  onUndoConfirm,
  onReopenCancelled,
}: OrderReviewDialogProps) {
  if (!order) return null;

  const totalAmount = parseFloat(order.totalAmount);

  // Render different action buttons based on order status
  const renderActionButtons = () => {
    switch (order.status) {
      case 'pending':
        return (
          <>
            {/* Left: Pass Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => onPass(order)}
              className="min-w-[120px]"
            >
              <X className="h-4 w-4 mr-2" />
              Pass
            </Button>

            {/* Middle: Counter Button (placeholder) */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => onCounter?.(order)}
              disabled={!onCounter}
              className="min-w-[140px]"
            >
              Counter Offer
            </Button>

            {/* Right: Accept Button */}
            <Button
              variant="default"
              size="lg"
              onClick={() => onAccept(order)}
              className="min-w-[160px] bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Accept Offer
            </Button>
          </>
        );

      case 'confirmed':
        return (
          <>
            {/* Left: Undo Button */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => onUndoConfirm?.(order)}
              className="min-w-[180px]"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Cancel Confirmation
            </Button>

            {/* Right: Proceed to Checkout */}
            <Button
              variant="default"
              size="lg"
              onClick={() => onProceedToCheckout?.(order)}
              className="min-w-[200px] bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Proceed to Checkout
            </Button>
          </>
        );

      case 'cancelled':
        return (
          <Button
            variant="default"
            size="lg"
            onClick={() => onReopenCancelled?.(order)}
            className="w-full max-w-md mx-auto bg-blue-600 hover:bg-blue-700"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reopen Order
          </Button>
        );

      case 'completed':
        return (
          <div className="text-center text-muted-foreground">
            <p className="text-sm">✅ This order has been completed</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
  <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-full h-screen p-0 gap-0">
        <DialogTitle className="sr-only">Review Order Request - Order #{order.id.slice(0, 8)}</DialogTitle>
        <div className="h-screen flex flex-col bg-background">
          {/* Header */}
          <div className="flex-shrink-0 h-16 border-b bg-card">
            <div className="h-full px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                >
                  <X className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold">Review Order Request</h2>
                  <p className="text-xs text-muted-foreground">
                    Order #{order.id.slice(0, 8)}... • {format(new Date(order.createdAt), "MMM d, h:mm a")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-8">
              {/* Customer Info Section */}
              <div className="bg-card rounded-lg border p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Name</p>
                    <p className="font-medium">{order.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      Email
                    </p>
                    <p className="font-medium">{order.customerEmail}</p>
                  </div>
                  {order.customerPhone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Phone
                      </p>
                      <p className="font-medium">{order.customerPhone}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Items Section */}
              <div className="bg-card rounded-lg border p-6 mb-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Items Requested ({order.items.length})
                </h3>
                <div className="space-y-4">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-b-0">
                      {/* Item Image */}
                      <div className="flex-shrink-0 w-24 h-32 bg-muted rounded-md overflow-hidden">
                        <img
                          src={item.asset.psaImageFrontUrl || PLACEHOLDER_IMAGE_URL}
                          alt={`${item.asset.playerName} card`}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base mb-1">
                          {item.asset.year} {item.asset.setName}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.asset.playerName} #{item.asset.cardNumber}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium">
                            PSA {item.asset.grade}
                          </span>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-2xl font-bold text-primary">
                          ${parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-card rounded-lg border p-6">
                <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal ({order.itemCount} {order.itemCount === 1 ? 'item' : 'items'})</span>
                    <span className="font-medium">${totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="text-lg font-semibold">Total</span>
                    <span className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes if any */}
              {order.notes && (
                <div className="bg-muted/50 rounded-lg p-4 mt-6">
                  <p className="text-sm text-muted-foreground mb-1">Customer Notes:</p>
                  <p className="text-sm">{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar - Fixed */}
          <div className="flex-shrink-0 border-t bg-card">
            <div className="max-w-4xl mx-auto px-4 py-4">
              <div className="flex items-center justify-between gap-4">
                {renderActionButtons()}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
