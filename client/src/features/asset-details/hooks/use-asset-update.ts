// 🤖 INTERNAL NOTE:
// Purpose: Optimized hook for updating asset purchase information with minimal cache invalidation
// Exports: useAssetUpdate mutation hook
// Feature: asset-details
// Dependencies: @tanstack/react-query, @/lib/queryClient

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Asset } from "@shared/schema";

interface UpdateAssetParams {
  assetId: string;
  updates: {
    purchasePrice?: number | null;
    purchaseDate?: string | null;
  };
}

export const useAssetUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ assetId, updates }: UpdateAssetParams) => {
      const response = await apiRequest('PATCH', `/api/assets/${assetId}`, updates);

      if (!response.ok) {
        throw new Error('Failed to update asset');
      }

      return response.json() as Promise<Asset>;
    },
    onSuccess: (updatedAsset, { assetId }) => {
      // Optimistic update - directly update the asset in cache
      queryClient.setQueryData([`/api/assets/${assetId}`], updatedAsset);
      
      // Only invalidate the specific asset query to trigger UI refresh
      // This is much faster than invalidating all assets/pricing queries
      queryClient.invalidateQueries({ 
        queryKey: [`/api/assets/${assetId}`],
        exact: true 
      });
      
      toast({
        title: "Asset updated",
        description: "Purchase information has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: "Failed to save purchase information. Please try again.",
        variant: "destructive",
      });
      console.error('Asset update error:', error);
    },
  });
};