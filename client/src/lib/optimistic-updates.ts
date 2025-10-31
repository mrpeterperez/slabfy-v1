/**
 * 🔥 PRODUCTION-QUALITY OPTIMISTIC UPDATES
 * 
 * Utilities for implementing instant UI updates with server sync.
 * Based on TanStack Query best practices.
 * 
 * Flow:
 * 1. User clicks action
 * 2. UI updates immediately (optimistic)
 * 3. Server request in background
 * 4. On success: Keep optimistic update
 * 5. On error: Rollback + show toast
 */

import { QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './query-keys';
import { useToast } from '@/hooks/use-toast';

// ===== COLLECTION OPTIMISTIC UPDATES =====

/**
 * Optimistically add asset to collection
 */
export function useOptimisticAddToCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ collectionId, assetId }: { collectionId: string; assetId: string }) => {
      const response = await fetch(`/api/collections/${collectionId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      if (!response.ok) throw new Error('Failed to add asset');
      return response.json();
    },

    // Before mutation runs
    onMutate: async ({ collectionId, assetId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.collections.assets(collectionId) 
      });

      // Snapshot the previous value
      const previousAssets = queryClient.getQueryData(
        queryKeys.collections.assets(collectionId)
      );

      // Optimistically update to the new value
      queryClient.setQueryData(
        queryKeys.collections.assets(collectionId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            assets: [...(old.assets || []), { id: assetId, addedAt: new Date().toISOString() }]
          };
        }
      );

      // Return context object with the snapshotted value
      return { previousAssets };
    },

    // If the mutation fails
    onError: (err, variables, context) => {
      // Rollback to the previous value
      if (context?.previousAssets) {
        queryClient.setQueryData(
          queryKeys.collections.assets(variables.collectionId),
          context.previousAssets
        );
      }

      toast({
        variant: 'destructive',
        title: 'Failed to add asset',
        description: 'Please try again.',
      });
    },

    // Always refetch after error or success
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.collections.assets(variables.collectionId) 
      });
    },

    // On success
    onSuccess: () => {
      toast({
        title: 'Asset added',
        description: 'Added to collection successfully',
      });
    },
  });
}

/**
 * Optimistically remove asset from collection
 */
export function useOptimisticRemoveFromCollection() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ collectionId, assetId }: { collectionId: string; assetId: string }) => {
      const response = await fetch(`/api/collections/${collectionId}/assets/${assetId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to remove asset');
      return response.json();
    },

    onMutate: async ({ collectionId, assetId }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.collections.assets(collectionId) 
      });

      const previousAssets = queryClient.getQueryData(
        queryKeys.collections.assets(collectionId)
      );

      // Optimistically remove the asset
      queryClient.setQueryData(
        queryKeys.collections.assets(collectionId),
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            assets: old.assets.filter((a: any) => a.id !== assetId)
          };
        }
      );

      return { previousAssets };
    },

    onError: (err, variables, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(
          queryKeys.collections.assets(variables.collectionId),
          context.previousAssets
        );
      }

      toast({
        variant: 'destructive',
        title: 'Failed to remove asset',
        description: 'Please try again.',
      });
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.collections.assets(variables.collectionId) 
      });
    },

    onSuccess: () => {
      toast({
        title: 'Asset removed',
        description: 'Removed from collection successfully',
      });
    },
  });
}

// ===== ASSET EDIT OPTIMISTIC UPDATES =====

/**
 * Optimistically update asset purchase price
 */
export function useOptimisticUpdateAssetPrice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ assetId, purchasePrice }: { assetId: string; purchasePrice: number }) => {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchasePrice }),
      });
      if (!response.ok) throw new Error('Failed to update price');
      return response.json();
    },

    onMutate: async ({ assetId, purchasePrice }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.assets.detail(assetId) 
      });

      const previousAsset = queryClient.getQueryData(
        queryKeys.assets.detail(assetId)
      );

      // Optimistically update the asset
      queryClient.setQueryData(
        queryKeys.assets.detail(assetId),
        (old: any) => old ? { ...old, purchasePrice } : old
      );

      return { previousAsset };
    },

    onError: (err, variables, context) => {
      if (context?.previousAsset) {
        queryClient.setQueryData(
          queryKeys.assets.detail(variables.assetId),
          context.previousAsset
        );
      }

      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: 'Could not update purchase price',
      });
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.assets.detail(variables.assetId) 
      });
    },
  });
}

// ===== BUYING DESK OPTIMISTIC UPDATES =====

/**
 * Optimistically add asset to buying session
 */
export function useOptimisticAddToBuyingSession() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ sessionId, globalAssetId, offerPrice }: { 
      sessionId: string; 
      globalAssetId: string;
      offerPrice: number;
    }) => {
      const response = await fetch(`/api/buying-desk/sessions/${sessionId}/assets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalAssetId, offerPrice }),
      });
      if (!response.ok) throw new Error('Failed to add asset');
      return response.json();
    },

    onMutate: async ({ sessionId, globalAssetId, offerPrice }) => {
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.buyingDesk.assets(sessionId) 
      });

      const previousAssets = queryClient.getQueryData(
        queryKeys.buyingDesk.assets(sessionId)
      );

      // Optimistically add the asset
      queryClient.setQueryData(
        queryKeys.buyingDesk.assets(sessionId),
        (old: any) => {
          if (!old) return old;
          return [...old, { 
            globalAssetId, 
            offerPrice,
            status: 'pending',
            createdAt: new Date().toISOString()
          }];
        }
      );

      return { previousAssets };
    },

    onError: (err, variables, context) => {
      if (context?.previousAssets) {
        queryClient.setQueryData(
          queryKeys.buyingDesk.assets(variables.sessionId),
          context.previousAssets
        );
      }

      toast({
        variant: 'destructive',
        title: 'Failed to add card',
        description: 'Could not add to buying session',
      });
    },

    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.buyingDesk.assets(variables.sessionId) 
      });
    },

    onSuccess: () => {
      toast({
        title: 'Card added',
        description: 'Added to buying session',
      });
    },
  });
}

// ===== GENERIC OPTIMISTIC UPDATE HELPER =====

/**
 * Generic optimistic update wrapper
 * Use this for simple list updates
 */
export function createOptimisticMutation<TData, TVariables extends { id: string }>({
  queryKey,
  mutationFn,
  updateFn,
  successMessage,
  errorMessage,
}: {
  queryKey: readonly unknown[];
  mutationFn: (variables: TVariables) => Promise<TData>;
  updateFn: (old: any, variables: TVariables) => any;
  successMessage?: string;
  errorMessage?: string;
}) {
  return function useOptimisticMutation() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
      mutationFn,

      onMutate: async (variables) => {
        await queryClient.cancelQueries({ queryKey });
        const previous = queryClient.getQueryData(queryKey);
        
        queryClient.setQueryData(queryKey, (old: any) => updateFn(old, variables));
        
        return { previous };
      },

      onError: (err, variables, context: any) => {
        if (context?.previous) {
          queryClient.setQueryData(queryKey, context.previous);
        }

        toast({
          variant: 'destructive',
          title: 'Error',
          description: errorMessage || 'Operation failed',
        });
      },

      onSettled: () => {
        queryClient.invalidateQueries({ queryKey });
      },

      onSuccess: () => {
        if (successMessage) {
          toast({
            title: 'Success',
            description: successMessage,
          });
        }
      },
    });
  };
}
