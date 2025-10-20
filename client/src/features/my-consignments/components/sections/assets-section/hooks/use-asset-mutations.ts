// 🤖 INTERNAL NOTE:
// Purpose: Asset mutations hook for consignment assets
// Exports: useAssetMutations hook
// Feature: my-consignments

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useAssetMutations(consignmentId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Dedicated mutation for list price updates
  const updateListPriceMutation = useMutation({
    mutationFn: async ({ assetId, listPrice }: { assetId: string; listPrice: number }) => {
      const response = await apiRequest(
        'PUT',
        `/api/consignments/${consignmentId}/assets/${assetId}`,
        { askingPrice: listPrice }
      );
      return response.json();
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
      return { assetId: variables.assetId, previous: variables.listPrice };
    },
    onSuccess: (_data, variables) => {
      // No toast here - let the caller handle it for bulk operations
    },
    onError: (error) => {
      toast({ 
        title: "Failed to update list price", 
        description: error.message,
        variant: "destructive" 
      });
    },
    onSettled: async () => {
      // Invalidate and wait for refetch to complete to ensure UI updates with fresh data
      await queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
    }
  });

  // Reserve price mutation
  const updateReserveMutation = useMutation({
    mutationFn: ({ assetId, reserve }: { assetId: string; reserve: number }) =>
      apiRequest("PUT", `/api/consignments/${consignmentId}/assets/${assetId}`, { reservePrice: reserve }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
      return { assetId: variables.assetId, previous: variables.reserve };
    },
    onSuccess: (_data, variables) => {
      // No toast here - let the caller handle it for bulk operations
    },
    onError: () => {
      toast({ title: "Failed to update reserve price", variant: "destructive" });
    },
    onSettled: async () => {
      // Invalidate and wait for refetch to complete to ensure UI updates with fresh data
      await queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
    }
  });

  // Split percentage mutation
  const updateSplitMutation = useMutation({
    mutationFn: ({ assetId, split }: { assetId: string; split: number }) =>
      apiRequest("PUT", `/api/consignments/${consignmentId}/assets/${assetId}`, { splitPercentage: split }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
      return { assetId: variables.assetId, previous: variables.split };
    },
    onSuccess: (_data, variables) => {
      toast({ title: "Split percentage updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update split percentage", variant: "destructive" });
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
    }
  });

  // Status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ assetId, status }: { assetId: string; status: string }) =>
      apiRequest("PUT", `/api/consignments/${consignmentId}/assets/${assetId}`, { status }),
    onSuccess: (data, variables) => {
      toast({ title: "Status updated successfully" });
      queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
    },
    onError: (error) => {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  });

  // Delete mutation  
  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      return await apiRequest('DELETE', `/api/consignments/${consignmentId}/assets/${assetId}`);
    },
    retry: false, // Don't retry delete operations - prevents repetitive errors
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] }),
        // 🔥 CRITICAL: Invalidate portfolio query so deleted consignment assets disappear from "My Portfolio"
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const k = query.queryKey as any[];
            return Array.isArray(k) && k.length > 0 && typeof k[0] === 'string' && k[0].includes('/api/user/') && k[0].includes('/assets');
          }
        }),
      ]);
      toast({ title: "Asset deleted from consignment" });
    },
    onError: (error) => {
      console.error('Delete asset error:', error);
      toast({ 
        title: "Failed to delete asset", 
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive" 
      });
    },
  });

  // Bulk update mutation (updates multiple assets at once)
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ 
      assetIds, 
      listPrice, 
      reserve, 
      split, 
      status 
    }: { 
      assetIds: string[]; 
      listPrice?: number; 
      reserve?: number; 
      split?: number; 
      status?: string;
    }) => {
      const response = await apiRequest(
        'PUT',
        `/api/consignments/${consignmentId}/assets/bulk`,
        { assetIds, listPrice, reserve, split, status }
      );
      return response.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] });
      toast({ 
        title: "Bulk Update Complete", 
        description: `Successfully updated ${data.updated} of ${data.total} asset(s)` 
      });
    },
    onError: (error) => {
      toast({ 
        title: "Bulk update failed", 
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive" 
      });
    },
  });

  // Bulk delete mutation (deletes multiple assets at once)
  const bulkDeleteMutation = useMutation({
    mutationFn: async (assetIds: string[]) => {
      const response = await apiRequest(
        'DELETE',
        `/api/consignments/${consignmentId}/assets/bulk`,
        { assetIds }
      );
      return response.json();
    },
    retry: false, // Don't retry bulk delete - prevents repetitive errors
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/consignments/${consignmentId}/assets`] }),
        // 🔥 CRITICAL: Invalidate portfolio query so deleted consignment assets disappear from "My Portfolio"
        queryClient.invalidateQueries({ 
          predicate: (query) => {
            const k = query.queryKey as any[];
            return Array.isArray(k) && k.length > 0 && typeof k[0] === 'string' && k[0].includes('/api/user/') && k[0].includes('/assets');
          }
        }),
      ]);
      toast({ 
        title: "Bulk Delete Complete", 
        description: `Successfully deleted ${data.deleted} of ${data.total} asset(s)` 
      });
    },
    onError: (error) => {
      console.error('Bulk delete error:', error);
      toast({ 
        title: "Bulk delete failed", 
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive" 
      });
    },
  });

  return {
    updateListPriceMutation,
    updateReserveMutation,
    updateSplitMutation,
    updateStatusMutation,
    deleteAssetMutation,
    bulkUpdateMutation,
    bulkDeleteMutation,
  };
}