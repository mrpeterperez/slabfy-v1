// 🤖 INTERNAL NOTE:
// Purpose: Hook for updating asset purchase information with proper cache invalidation
// Exports: useAssetUpdate mutation hook
// Feature: asset-details
// Dependencies: @tanstack/react-query, @/lib/queryClient

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Asset } from "@shared/schema";
import { useAuth } from "@/components/auth-provider";

interface UpdateAssetParams {
  assetId: string;
  updates: {
    purchasePrice?: number | null;
    purchaseDate?: string | null;
    purchaseSource?: string | null;
  };
}

export const useAssetUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ assetId, updates }: UpdateAssetParams) => {
      console.log('🔄 useAssetUpdate - Starting mutation:', { assetId, updates });
      const response = await apiRequest('PATCH', `/api/assets/${assetId}`, updates);

      if (!response.ok) {
        console.error('❌ useAssetUpdate - Request failed:', response.status);
        throw new Error('Failed to update asset');
      }

      const result = await response.json() as Asset;
      console.log('✅ useAssetUpdate - Success:', result);
      return result;
    },
    onSuccess: async (updatedAsset, { assetId }) => {
      // Optimistically update the specific asset in cache
      queryClient.setQueryData([`/api/assets/${assetId}`], updatedAsset);
      
      // Invalidate all relevant queries to ensure UI updates everywhere
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/assets"] }),
        queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/assets/${assetId}`] }),
        // CRITICAL: Also invalidate the combined assets-or-global query key used on asset detail page
        queryClient.invalidateQueries({ 
          predicate: (q) => Array.isArray(q.queryKey) && 
            q.queryKey[0] === `/api/assets-or-global/${assetId}`
        }),
        // Asset edits can affect pricing/sparklines
        queryClient.invalidateQueries({ 
          predicate: (q) => Array.isArray(q.queryKey) && q.queryKey[0] === 'portfolio-pricing-v2' 
        }),
        queryClient.invalidateQueries({ queryKey: [`/api/pricing/${assetId}`] }),
        queryClient.invalidateQueries({ queryKey: [`sparkline-data-${assetId}`] }),
      ]);
      
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