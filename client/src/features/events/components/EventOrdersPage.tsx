import { useState } from "react";
import { useParams } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEventOrders, useUpdateOrderStatus } from "../hooks/use-event-orders";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ExternalLink, Package, ShoppingCart, Clock, Eye } from "lucide-react";
import { OrderReviewDialog } from "./order-review/OrderReviewDialog";
import { EventCheckoutDialog, type EventPaymentMethod } from "./checkout/EventCheckoutDialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { EventOrder } from "../hooks/use-event-orders";

export function EventOrdersPage() {
  const { id: eventId } = useParams();
  const { data: orders, isLoading } = useEventOrders(eventId!);
  const updateOrderStatus = useUpdateOrderStatus(eventId!);
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<EventOrder | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<EventOrder | null>(null);
  const { toast } = useToast();

  const handleReviewClick = (order: EventOrder) => {
    setSelectedOrder(order);
    setReviewOpen(true);
  };

  const handleAccept = async (order: EventOrder) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: "confirmed",
      });
      toast({
        title: "Order accepted",
        description: "Opening checkout to complete the sale.",
      });
      setReviewOpen(false);
      // Open checkout with order context
      setCheckoutOrder(order);
      setCheckoutOpen(true);
    } catch (error) {
      toast({
        title: "Failed to accept order",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCheckoutComplete = async (method: EventPaymentMethod, details?: { 
    receipt?: { channel?: string };
    buyer?: { id: string | null; name: string; email?: string; phone?: string; companyName?: string | null };
  }) => {
    if (!checkoutOrder) return;

    // Prevent duplicate submissions - check if order is already completed
    if (checkoutOrder.status === "completed") {
      toast({
        title: "Already processed",
        description: "This order has already been completed.",
        variant: "destructive",
      });
      setCheckoutOpen(false);
      setCheckoutOrder(null);
      return;
    }

    try {
      // Use real buyer info from checkout (matched contact name) or fallback to order customer name
      const buyerName = details?.buyer?.name || checkoutOrder.customerName;
      const buyerEmail = details?.buyer?.email || checkoutOrder.customerEmail;
      const buyerPhone = details?.buyer?.phone || checkoutOrder.customerPhone;

      // Create sales transactions for each order item
      for (const item of checkoutOrder.items) {
        const salesData = {
          eventInventoryId: item.eventInventoryId,
          globalAssetId: item.globalAssetId,
          salePrice: String(item.price),
          paymentMethod: method,
          orderId: checkoutOrder.id,
          buyerName, // Use real contact name if matched
          buyerEmail,
          buyerPhone,
          buyerId: details?.buyer?.id || null,
          sellerId: null,
          sourceType: "portfolio", // Storefront orders are from portfolio
          receiptSent: details?.receipt?.channel !== "none",
          receiptChannel: details?.receipt?.channel || null,
          notes: `Storefront order - Sold via ${method} payment`,
        };

        await apiRequest("POST", `/api/events/${eventId}/sales`, salesData);
      }

      // Update order status to completed
      await updateOrderStatus.mutateAsync({
        orderId: checkoutOrder.id,
        status: "completed",
      });

      toast({
        title: "Sale completed!",
        description: `${checkoutOrder.itemCount} item(s) sold successfully.`,
      });

      setCheckoutOpen(false);
      setCheckoutOrder(null);

      // Refresh orders and inventory
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "sales"] });
    } catch (error) {
      console.error("Failed to complete order checkout:", error);
      toast({
        title: "Checkout failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handlePass = async (order: EventOrder) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: "cancelled",
      });
      toast({
        title: "Order declined",
        description: "Items have been returned to available inventory.",
      });
      setReviewOpen(false);
    } catch (error) {
      toast({
        title: "Failed to decline order",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCounter = (order: EventOrder) => {
    // TODO: Wire up counter flow
    toast({
      title: "Coming soon",
      description: "Counter offer functionality will be available soon.",
    });
  };

  const handleProceedToCheckout = (order: EventOrder) => {
    // Open checkout for confirmed order
    setReviewOpen(false);
    setCheckoutOrder(order);
    setCheckoutOpen(true);
  };

  const handleUndoConfirm = async (order: EventOrder) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: "pending",
      });
      toast({
        title: "Confirmation cancelled",
        description: "Order returned to pending status. Items remain reserved.",
      });
      // Keep dialog open to show updated status
    } catch (error) {
      toast({
        title: "Failed to cancel confirmation",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleReopenCancelled = async (order: EventOrder) => {
    try {
      await updateOrderStatus.mutateAsync({
        orderId: order.id,
        status: "pending",
      });
      toast({
        title: "Order reopened",
        description: "Order returned to pending status. Items have been reserved again.",
      });
      // Keep dialog open to show updated status
    } catch (error) {
      toast({
        title: "Failed to reopen order",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    return variants[status] || "default";
  };

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0 w-full max-w-full">
        {/* Toolbar header */}
        <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px]">
          <div className="flex items-center justify-between gap-4 w-full">
            <h2 className="font-heading text-lg font-semibold text-foreground">Orders</h2>
          </div>
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="flex-1 min-w-0 w-full max-w-full">
        {/* Toolbar header */}
        <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px]">
          <div className="flex items-center justify-between gap-4 w-full">
            <h2 className="font-heading text-lg font-semibold text-foreground">Orders</h2>
          </div>
        </div>
        {/* Empty state */}
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Orders from your event storefront will appear here
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 w-full max-w-full">
      {/* Toolbar header */}
      <div className="hidden lg:block border-b border-border px-8 py-4 min-h-[58px]">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Orders</h2>
        </div>
      </div>
      {/* Content */}
      <div className="p-6">
        <div className="bg-card-muted rounded-lg overflow-hidden border border-border">
          <table className="w-full min-w-full text-xs sm:text-sm text-muted-foreground">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 font-medium whitespace-nowrap">Order ID</th>
                <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Customer</th>
                <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Items</th>
                <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap">Total</th>
                <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap hidden sm:table-cell">Status</th>
                <th className="text-left p-2 sm:p-3 font-medium whitespace-nowrap hidden sm:table-cell">Date</th>
                <th className="text-right p-2 sm:p-3 pr-4 sm:pr-6 font-medium w-10 sm:w-14"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr 
                  key={order.id}
                  className="bg-card border-b hover:bg-muted/25 cursor-pointer group"
                  onClick={() => handleReviewClick(order)}
                >
                  <td className="p-2 sm:p-3 pl-4 sm:pl-6">
                    <div className="font-mono text-xs">
                      {order.id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="p-2 sm:p-3">
                    <div>
                      <p className="font-medium text-sm">{order.customerName}</p>
                      <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                    </div>
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="space-y-1">
                      {order.items.map((item) => (
                        <div key={item.id} className="text-xs">
                          <p className="font-medium">
                            {item.asset.year} {item.asset.setName} {item.asset.playerName} #{item.asset.cardNumber}
                          </p>
                          <p className="text-muted-foreground">
                            {(() => { const n = Number(item.price); return `$${isFinite(n) ? n.toFixed(2) : '0.00'}`; })()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3">
                    <div className="font-semibold text-sm">
                      {(() => { const n = Number(order.totalAmount); return `$${isFinite(n) ? n.toFixed(2) : '0.00'}`; })()}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 hidden sm:table-cell">
                    <Badge variant={getStatusBadge(order.status)}>
                      {order.status}
                    </Badge>
                  </td>
                  <td className="p-2 sm:p-3 hidden sm:table-cell">
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-4 w-4" />
                      {format(new Date(order.createdAt), "MMM d, h:mm a")}
                    </div>
                  </td>
                  <td className="p-2 sm:p-3 pr-4 sm:pr-6 text-right">
                    {order.status === "pending" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReviewClick(order);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review
                      </Button>
                    ) : (
                      <button
                        className="text-primary hover:text-primary/80"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReviewClick(order);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Review Dialog */}
      <OrderReviewDialog
        order={selectedOrder}
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        onAccept={handleAccept}
        onPass={handlePass}
        onCounter={handleCounter}
        onProceedToCheckout={handleProceedToCheckout}
        onUndoConfirm={handleUndoConfirm}
        onReopenCancelled={handleReopenCancelled}
      />

      {/* Checkout Dialog for accepted orders */}
      {checkoutOpen && checkoutOrder && (
        <EventCheckoutDialog
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          amount={parseFloat(checkoutOrder.totalAmount)}
          discountedAmount={parseFloat(checkoutOrder.totalAmount)}
          itemDescription={`${checkoutOrder.itemCount} item${checkoutOrder.itemCount === 1 ? "" : "s"} from storefront order`}
          onPaymentComplete={handleCheckoutComplete}
          onNavigate={(route) => {
            console.log("Navigate to:", route);
          }}
          orderId={checkoutOrder.id}
          customerName={checkoutOrder.customerName}
          customerEmail={checkoutOrder.customerEmail}
          customerPhone={checkoutOrder.customerPhone || undefined}
        />
      )}
    </div>
  );
}
