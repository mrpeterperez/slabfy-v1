// 🤖 INTERNAL NOTE:
// Purpose: Hook to fetch event available inventory for public storefront
// Exports: useStorefrontInventory hook
// Feature: sales-channels/show-storefront

import { useQuery } from "@tanstack/react-query";

export interface StorefrontInventoryItem {
  id: string;
  eventInventoryId: string;
  eventId: string;
  globalAssetId: string;
  // Asset metadata
  title: string;
  playerName?: string | null;
  year?: string | null;
  setName?: string | null;
  cardNumber?: string | null;
  grade?: string | null;
  grader?: string | null;
  certNumber?: string | null;
  psaImageFrontUrl?: string | null;
  psaImageBackUrl?: string | null;
  category?: string | null;
  type?: string | null;
  // Pricing
  askingPrice?: string | null;
  // Quantity
  qty: number;
}

export function useStorefrontInventory(eventId?: string) {
  return useQuery({
    queryKey: ['storefront-inventory', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      
      // Use direct fetch for public endpoint (no auth required)
      const response = await fetch(`/api/events/${eventId}/available-inventory`);
      if (!response.ok) {
        throw new Error('Failed to fetch storefront inventory');
      }
      return response.json() as Promise<StorefrontInventoryItem[]>;
    },
    enabled: !!eventId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when customer returns to storefront
    refetchOnMount: true, // Refetch when component mounts for fresh availability
  });
}
