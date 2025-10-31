// 🤖 INTERNAL NOTE:
// Purpose: React hooks for consignment data fetching and mutations
// Exports: useConsignments, useCreateConsignment, useUpdateConsignment, useDeleteConsignment, useConsignor, etc.
// Feature: my-consignments
// Dependencies: @tanstack/react-query, @/components/auth-provider, @shared/schema, ../api

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { 
  getConsignments, 
  getConsignment, 
  createConsignment, 
  updateConsignment, 
  deleteConsignment,
  archiveConsignment,
  unarchiveConsignment,
  bulkArchiveConsignments,
  bulkUnarchiveConsignments,
  bulkDeleteConsignments,
  getConsignor,
  updateConsignor,
  getConsignmentStatusCounts
} from "../api/consignment-api";
import { getConsignmentStats, getConsignmentSummaries, type ConsignmentSummary, type ConsignmentStatusCounts } from "../api/consignment-api";
import { InsertConsignment, UpdateConsignment, InsertConsignor, UpdateConsignor, InsertContact } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to get all consignments for the current user with optional archived or status filter
 */
export const useConsignments = (archived?: boolean, status?: string) => {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["/api/consignments", user?.id, { archived, status }],
    queryFn: () => getConsignments(user!.id, archived, status),
    enabled: !!user?.id && !authLoading,
    staleTime: 60_000, // 1 minute - balance between freshness and performance
    // Cache settings handled by global QueryClient defaults
  });
};

/**
 * Hook to get a single consignment
 */
export const useConsignment = (consignmentId: string) => {
  return useQuery({
    queryKey: ["/api/consignments", consignmentId],
    queryFn: () => getConsignment(consignmentId),
    enabled: !!consignmentId,
    staleTime: 60_000, // 1 minute - balance between freshness and performance
    // Cache settings handled by global QueryClient defaults
  });
};

/**
 * Hook to create a new consignment
 */
export const useCreateConsignment = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  return useMutation({
    mutationFn: (data: InsertConsignment & { consignor: InsertContact }) => 
      createConsignment(data),
    onSuccess: () => {
      // Invalidate and refetch consignments list and aggregate stats
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
      // New consignments can create a new consignor Contact; refresh Contacts too
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
    },
  });
};

/**
 * Hook to update a consignment
 */
export const useUpdateConsignment = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateConsignment }) => 
      updateConsignment(id, data),
    onSuccess: (_, { id }) => {
      // Invalidate specific consignment and list + aggregate stats
      queryClient.invalidateQueries({ queryKey: ["/api/consignments", id] });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
    },
  });
};

/**
 * Hook to delete a consignment
 */
export const useDeleteConsignment = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  return useMutation({
    mutationFn: (consignmentId: string) => deleteConsignment(consignmentId),
    onSuccess: (_data, consignmentId) => {
      // Invalidate consignments list and related aggregates so UI updates immediately
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments", consignmentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
      
      // 🎯 CRITICAL: Invalidate portfolio cache so deleted consignment assets disappear immediately
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] });
    },
  });
};

/**
 * Hook to get consignor information
 */
export const useConsignor = (consignmentId: string) => {
  return useQuery({
    queryKey: ["/api/consignments", consignmentId, "consignor"],
    queryFn: () => getConsignor(consignmentId),
    enabled: !!consignmentId,
  });
};

/**
 * Hook to update consignor information
 */
export const useUpdateConsignor = (consignmentId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateConsignor) => updateConsignor(consignmentId, data),
    onSuccess: () => {
      // Invalidate consignor data
      queryClient.invalidateQueries({ queryKey: ["/api/consignments", consignmentId, "consignor"] });
    },
  });
};

/**
 * Hook to get consignment status counts for the current user
 */
export const useConsignmentStatusCounts = () => {
  const { user, loading: authLoading } = useAuth();
  return useQuery<ConsignmentStatusCounts>({
    queryKey: ["/api/consignments/status-counts", user?.id],
    queryFn: () => getConsignmentStatusCounts(),
    enabled: !!user?.id && !authLoading,
    staleTime: 60_000,
  });
};

/**
 * Hook to get the next auto-generated consignment title
 */
export const useNextConsignmentTitle = () => {
  const { user, loading: authLoading } = useAuth();
  // Gate until user object resolved to avoid premature 401s that thrash retries
  const enabled = !!user?.id; 
  
  return useQuery({
    queryKey: ["/api/consignments/next-title", user?.id],
    queryFn: async () => {
      // Use central apiRequest so Authorization header + retries are applied.
      const { apiRequest } = await import("@/lib/queryClient");
  const res = await apiRequest("GET", `/api/consignments/next-title?userId=${user?.id}`);
  const json: { title: string } = await res.json();
  return json.title;
    },
    enabled,
  });
};

/**
 * Hook to get aggregate consignment stats for the current user
 */
export const useConsignmentStats = () => {
  const { user, loading: authLoading } = useAuth();
  return useQuery({
    queryKey: ["/api/consignments/stats", user?.id],
    queryFn: () => getConsignmentStats(),
    enabled: !!user?.id && !authLoading,
    staleTime: 60_000,
  });
};

/**
 * Hook to get per-consignment summaries (revenue/pipeline/profit)
 */
export const useConsignmentSummaries = () => {
  const { user, loading: authLoading } = useAuth();
  return useQuery<ConsignmentSummary[]>({
    queryKey: ["/api/consignments/summary", user?.id],
    queryFn: () => getConsignmentSummaries(),
    enabled: !!user?.id && !authLoading,
    staleTime: 60_000,
  });
};

/**
 * Hook to archive a consignment
 */
export const useArchiveConsignment = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: archiveConsignment,
    onSuccess: (updated) => {
      // Update the specific consignment cache immediately
      queryClient.setQueryData(["/api/consignments", updated.id], updated);
      // Refetch detail to ensure server is source of truth
      queryClient.invalidateQueries({ queryKey: ["/api/consignments", updated.id] });
      // Invalidate ALL consignment lists (archived and non-archived)
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false // This will invalidate all variations including archived param
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
      
      // 🎯 CRITICAL: Invalidate portfolio cache so archived consignment assets disappear immediately
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] });
      
      toast({
        title: "Consignment archived",
        description: "The consignment has been archived successfully.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to archive consignment";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to unarchive a consignment
 */
export const useUnarchiveConsignment = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: unarchiveConsignment,
    onSuccess: (updated) => {
      // Update the specific consignment cache immediately
      queryClient.setQueryData(["/api/consignments", updated.id], updated);
      // Refetch detail to ensure server is source of truth
      queryClient.invalidateQueries({ queryKey: ["/api/consignments", updated.id] });
      // Invalidate ALL consignment lists (archived and non-archived)
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false // This will invalidate all variations including archived param
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
      
      // 🎯 CRITICAL: Invalidate portfolio cache so restored consignment assets reappear immediately
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] });
      
      toast({
        title: "Consignment unarchived",
        description: "The consignment has been restored successfully.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to unarchive consignment";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook for bulk archiving consignments
 */
export const useBulkArchiveConsignments = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: bulkArchiveConsignments,
    onSuccess: (data, consignmentIds) => {
      // Invalidate individual consignment queries for each ID
      consignmentIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/consignments", id] });
      });
      
      // Invalidate list queries
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
      
      // 🎯 CRITICAL: Invalidate portfolio cache so bulk archived consignment assets disappear immediately
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] });
      
      // Show partial success if there were failures
      if (data.failedCount && data.failedCount > 0) {
        toast({
          title: "Partial success",
          description: `Archived ${data.archivedCount} of ${consignmentIds.length} consignment(s). ${data.failedCount} failed.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Consignments archived",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to archive consignments";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook for bulk unarchiving consignments
 */
export const useBulkUnarchiveConsignments = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: bulkUnarchiveConsignments,
    onSuccess: (data, consignmentIds) => {
      // Invalidate individual consignment queries for each ID
      consignmentIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/consignments", id] });
      });
      
      // Invalidate list queries
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
      
      // 🎯 CRITICAL: Invalidate portfolio cache so bulk unarchived consignment assets reappear immediately
      queryClient.invalidateQueries({ queryKey: [`/api/user/${user?.id}/assets`] });
      
      // Show partial success if there were failures
      if (data.failedCount && data.failedCount > 0) {
        toast({
          title: "Partial success",
          description: `Unarchived ${data.unarchivedCount} of ${consignmentIds.length} consignment(s). ${data.failedCount} failed.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Consignments unarchived",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to unarchive consignments";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook for bulk deleting consignments (only archived consignments)
 */
export const useBulkDeleteConsignments = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: bulkDeleteConsignments,
    onSuccess: (data, consignmentIds) => {
      // Invalidate individual consignment queries for each ID
      consignmentIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: ["/api/consignments", id] });
      });
      
      // Invalidate list queries
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments", user?.id],
        exact: false
      });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/stats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/consignments/summary", user?.id] });
      
      // Show partial success if there were failures
      if (data.failedCount && data.failedCount > 0) {
        toast({
          title: "Partial success",
          description: `Deleted ${data.deletedCount} of ${consignmentIds.length} consignment(s). ${data.failedCount} failed.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Consignments deleted",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to delete consignments";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};