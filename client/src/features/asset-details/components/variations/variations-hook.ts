// 🤖 INTERNAL NOTE (LLM):
// This file defines the useVariations hook for fetching owned variations of a specific card.
// Filters user's collection to find cards with same base characteristics but different variants/grades.
// Part of the `asset-details` feature, under the variations subfolder.
// Depends on React Query and shared Asset schema.

import { useQuery } from "@tanstack/react-query";
import { Asset } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export interface UseVariationsParams {
  baseAsset: Asset | null;
  enabled?: boolean;
  cachedAssets?: Asset[]; // optional preloaded user assets to avoid refetch
}

export interface UseVariationsResult {
  variations: Asset[];
  isLoading: boolean;
  error: Error | null;
}

export const useVariations = ({ 
  baseAsset, 
  enabled = true,
  cachedAssets
}: UseVariationsParams): UseVariationsResult => {
  const {
    data: variations = [],
    isLoading,
    error
  } = useQuery({
    queryKey: [`/api/assets/variations/${baseAsset?.id}`, cachedAssets?.length ?? 0],
    queryFn: async () => {
      if (!baseAsset?.userId) return [];
      // Prefer cached assets if provided to avoid extra network calls
      let allAssets: Asset[] | undefined = cachedAssets;
      if (!allAssets) {
        const response = await apiRequest('GET', `/api/user/${baseAsset.userId}/assets`);
        allAssets = await response.json();
      }

  // Safety: ensure defined
  const list = allAssets ?? [];

  // Filter for variations of the same base card
      // Same player, year, set, card number, but different variant OR grade
  const variations = list.filter(asset => 
        asset.id !== baseAsset.id && // Not the current asset
        asset.playerName === baseAsset.playerName && // Same player
        asset.year === baseAsset.year && // Same year
        asset.setName === baseAsset.setName && // Same set
        asset.cardNumber === baseAsset.cardNumber && // Same card number
        (
          // Different variant (RED ICE vs PINK ICE vs Base)
          asset.variant !== baseAsset.variant ||
          // Or different grade (PSA 8 vs PSA 9 vs PSA 10)
          asset.grade !== baseAsset.grade ||
          // Or different grader (PSA vs BGS vs SGC)
          asset.grader !== baseAsset.grader
        )
      );

      return variations;
    },
  enabled: enabled && !!baseAsset?.userId
  });

  return {
    variations,
    isLoading,
    error
  };
};