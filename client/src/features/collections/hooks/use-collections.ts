import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { TIER_3_DYNAMIC } from '@/lib/cache-tiers';
import { 
  getCollections, 
  getCollectionsSummary, 
  getCollection,
  createCollection, 
  updateCollection, 
  deleteCollection,
  getCollectionAssets,
  getCollectionAssetsWithOwnership,
  addAssetToCollection,
  removeAssetFromCollection,
  archiveCollection,
  unarchiveCollection,
  bulkArchiveCollections,
  bulkUnarchiveCollections,
  bulkDeleteCollections
} from '../api/collections-api';
import { type InsertCollection, type UpdateCollection, type InsertCollectionAsset } from '@shared/schema';

/**
 * Hook to get all collections
 */
export const useCollections = (archived?: boolean) => {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: archived 
      ? ['collections', { archived }] as const
      : queryKeys.collections.all,
    queryFn: () => getCollections(archived),
    enabled: !!user && !authLoading,
    placeholderData: (previousData) => previousData || ([] as any),
    select: (data) => Array.isArray(data) ? data : [],
    ...TIER_3_DYNAMIC,
  });
};

/**
 * Hook to get collections summary
 */
export const useCollectionsSummary = () => {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: queryKeys.collections.summary(),
    queryFn: getCollectionsSummary,
    enabled: !!user && !authLoading,
    placeholderData: (previousData) => previousData || {
      totalCollections: 0,
      totalAssets: 0,
      favoriteCollections: 0,
      publicCollections: 0,
    },
    ...TIER_3_DYNAMIC,
  });
};

/**
 * Hook to get a single collection
 */
export const useCollection = (collectionId: string) => {
  return useQuery({
    queryKey: queryKeys.collections.detail(collectionId),
    queryFn: () => getCollection(collectionId),
    enabled: !!collectionId,
    placeholderData: (previousData) => previousData,
    ...TIER_3_DYNAMIC,
  });
};

/**
 * Hook to create a new collection
 */
export const useCreateCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: InsertCollection & { userId?: string }) => createCollection(data),
    onSuccess: () => {
      // Invalidate and refetch collections list and summary
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({
        title: "Collection created",
        description: "Your new collection has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create collection",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to update a collection
 */
export const useUpdateCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCollection }) => 
      updateCollection(id, data),
    onMutate: async ({ id, data }) => {
      // Optimistic update: snapshot current cache and apply patch
      await queryClient.cancelQueries({ queryKey: ["/api/collections", id] });
      const prev = queryClient.getQueryData(["/api/collections", id]);
      if (prev && typeof prev === 'object') {
        // shallow merge for simple fields like isPublic, thumbnailUrl, etc.
        queryClient.setQueryData(["/api/collections", id], { ...(prev as any), ...(data as any) });
      }
      return { prev, id } as { prev: unknown; id: string };
    },
    onError: (error: any, _vars, ctx) => {
      // rollback
      if (ctx?.prev) {
        queryClient.setQueryData(["/api/collections", ctx.id], ctx.prev);
      }
      toast({
        title: "Error",
        description: error?.message || "Failed to update collection",
        variant: "destructive",
      });
    },
    onSuccess: (_, { id }) => {
      // Invalidate specific collection and list
      queryClient.invalidateQueries({ queryKey: ["/api/collections", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({
        title: "Collection updated",
        description: "The collection has been updated successfully.",
      });
    },
  });
};

/**
 * Hook to delete a collection
 */
export const useDeleteCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (collectionId: string) => deleteCollection(collectionId),
    onSuccess: () => {
      // Invalidate collections list and summary
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({
        title: "Collection deleted",
        description: "The collection has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete collection",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to get collection assets
 */
export const useCollectionAssets = (collectionId: string) => {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["/api/collections", collectionId, "assets", user?.id],
    queryFn: () => getCollectionAssetsWithOwnership(collectionId, user?.id || ""),
    enabled: !!collectionId && !!user?.id && !authLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes (increased for better performance)
    gcTime: 60 * 60 * 1000, // 1 hour cache retention
    refetchOnMount: false, // Don't refetch when component mounts
    refetchOnReconnect: false, // Don't refetch on network reconnect
    refetchOnWindowFocus: false, // Don't refetch when window gains focus
    retry: 2, // Retry failed requests only 2 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};

/**
 * Hook to add asset to collection
 */
export const useAddAssetToCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: InsertCollectionAsset) => addAssetToCollection(data),
    onSuccess: (_, { collectionId }) => {
      // Invalidate collection assets and collection details
      // Invalidate any variant of the assets query (some include userId in the key)
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId, "assets"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({
        title: "Asset added",
        description: "The asset has been added to the collection.",
      });
    },
    onError: (error: any) => {
      console.error('Add asset error:', error);
      
      // Handle different error types
      let title = "Error";
      let description = "Failed to add asset to collection";
      
      if (error.status === 409) {
        // Certificate conflict or duplicate asset error
        title = error.error || "Asset already exists";
        description = error.details || "This asset is already in use elsewhere";
      } else if (error.message) {
        description = error.message;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to remove asset from collection
 */
export const useRemoveAssetFromCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ collectionId, globalAssetId }: { collectionId: string; globalAssetId: string }) => 
      removeAssetFromCollection(collectionId, globalAssetId),
    onSuccess: (_, { collectionId }) => {
      // Invalidate collection assets and collection details
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId, "assets"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({
        title: "Asset removed",
        description: "The asset has been removed from the collection.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove asset from collection",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to archive a collection
 */
export const useArchiveCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (collectionId: string) => archiveCollection(collectionId),
    onSuccess: (_, collectionId) => {
      // Invalidate collections lists and specific collection
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({
        title: "Collection archived",
        description: "The collection has been archived successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive collection",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to unarchive a collection
 */
export const useUnarchiveCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (collectionId: string) => unarchiveCollection(collectionId),
    onSuccess: (_, collectionId) => {
      // Invalidate collections lists and specific collection
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections", collectionId] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      toast({
        title: "Collection unarchived",
        description: "The collection has been unarchived successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to unarchive collection",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to bulk archive collections
 */
export const useBulkArchiveCollections = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (collectionIds: string[]) => bulkArchiveCollections(collectionIds),
    onSuccess: (response, collectionIds) => {
      // Invalidate collections lists and summary
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      // Invalidate each individual collection for detail pages
      collectionIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/collections", id] });
      });
      
      // Show appropriate toast based on success/partial failure
      if (response.failedCount && response.failedCount > 0) {
        toast({
          title: "Partial success",
          description: response.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Collections archived",
          description: response.message || `Successfully archived ${response.archivedCount} collection(s)`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to archive collections",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to bulk unarchive collections
 */
export const useBulkUnarchiveCollections = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (collectionIds: string[]) => bulkUnarchiveCollections(collectionIds),
    onSuccess: (response, collectionIds) => {
      // Invalidate collections lists and summary
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      // Invalidate each individual collection for detail pages
      collectionIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/collections", id] });
      });
      
      // Show appropriate toast based on success/partial failure
      if (response.failedCount && response.failedCount > 0) {
        toast({
          title: "Partial success",
          description: response.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Collections restored",
          description: response.message || `Successfully restored ${response.unarchivedCount} collection(s)`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to restore collections",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to bulk delete collections (archived only)
 */
export const useBulkDeleteCollections = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (collectionIds: string[]) => bulkDeleteCollections(collectionIds),
    onSuccess: (response, collectionIds) => {
      // Invalidate collections lists and summary
      queryClient.invalidateQueries({ queryKey: ["/api/collections"] });
      queryClient.invalidateQueries({ queryKey: ["/api/collections/summary"] });
      // Invalidate each individual collection for detail pages
      collectionIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/collections", id] });
      });
      
      // Show appropriate toast based on success/partial failure
      if (response.failedCount && response.failedCount > 0) {
        toast({
          title: "Partial success",
          description: response.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Collections deleted",
          description: response.message || `Successfully deleted ${response.deletedCount} collection(s)`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete collections",
        variant: "destructive",
      });
    },
  });
};