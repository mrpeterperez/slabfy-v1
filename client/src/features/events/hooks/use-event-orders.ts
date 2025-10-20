// 🤖 INTERNAL NOTE:
// Purpose: React Query hooks for event storefront orders
// Exports: useEventOrders, useUpdateOrderStatus
// Feature: events
// Dependencies: @tanstack/react-query

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

// Query key factory
const eventOrdersKeys = {
  all: ["eventOrders"] as const,
  byEvent: (eventId: string) => [...eventOrdersKeys.all, eventId] as const,
};

// Types
export interface EventOrderItem {
  id: string;
  orderId: string;
  globalAssetId: string;
  eventInventoryId: string | null;
  price: string;
  createdAt: Date;
  asset: {
    id: string;
    playerName: string;
    year: string;
    setName: string;
    cardNumber: string;
    grade: string;
    psaImageFrontUrl: string | null;
    psaImageBackUrl: string | null;
  };
}

export interface EventOrder {
  id: string;
  userId: string;
  eventId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  totalAmount: string;
  itemCount: number;
  status: "pending" | "contacted" | "confirmed" | "completed" | "cancelled";
  notes: string | null;
  createdAt: Date;
  contactedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  items: EventOrderItem[];
}

// Get orders for an event
export function useEventOrders(eventId: string) {
  return useQuery<EventOrder[]>({
    queryKey: eventOrdersKeys.byEvent(eventId),
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/events/${eventId}/orders`);
      return response.json();
    },
    enabled: !!eventId,
    staleTime: 30 * 1000, // 30 seconds - orders should be fairly fresh
    refetchInterval: 60 * 1000, // Auto-refetch every minute for new orders
  });
}

// Update order status
export function useUpdateOrderStatus(eventId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const response = await apiRequest(
        "PATCH",
        `/api/events/${eventId}/orders/${orderId}`,
        { status }
      );
      return response.json();
    },
    onSuccess: () => {
      // Invalidate orders list to refetch
      queryClient.invalidateQueries({ queryKey: eventOrdersKeys.byEvent(eventId) });
      // Also invalidate inventory since status changes affect it
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "inventory"] });
    },
  });
}
