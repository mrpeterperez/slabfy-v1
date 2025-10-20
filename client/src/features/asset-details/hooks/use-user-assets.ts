// 🤖 INTERNAL NOTE (LLM):
// Purpose: Fetch and cache a user's assets once via React Query to be reused by related/variations computations.
// Exports: useUserAssets (named)
// Feature: asset-details
// Dependencies: @tanstack/react-query

import { useQuery } from "@tanstack/react-query";
import type { Asset } from "@shared/schema";

export function useUserAssets(userId?: string) {
  const { data = [], isLoading, error } = useQuery<Asset[]>({
    queryKey: userId ? [`/api/user/${userId}/assets`] : [],
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes fresh
    gcTime: 60 * 60 * 1000,    // 60 minutes in cache
    refetchOnWindowFocus: false,
  });

  return { assets: data, isLoading, error };
}
