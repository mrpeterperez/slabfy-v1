// 🤖 INTERNAL NOTE:
// Purpose: React Query hooks for events data fetching
// Exports: useEvents, useEvent, useCreateEvent, useUpdateEvent, useDeleteEvent
// Feature: events
// Dependencies: @tanstack/react-query, events API

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { eventsApi } from "../api";
import { CreateEventData, UpdateEventData } from "../types/event-types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Query key factory for consistent cache management
const eventsKeys = {
  all: ["events"] as const,
  lists: () => [...eventsKeys.all, "list"] as const,
  list: (filters: Record<string, any>) => [...eventsKeys.lists(), { filters }] as const,
  details: () => [...eventsKeys.all, "detail"] as const,
  detail: (id: string) => [...eventsKeys.details(), id] as const,
  summary: () => [...eventsKeys.all, "summary"] as const,
  inventoryCount: (id: string) => [...eventsKeys.detail(id), "inventoryCount"] as const,
};

// Get all events for current user
export function useEvents(archived?: boolean) {
  return useQuery({
    queryKey: eventsKeys.list({ archived }),
    queryFn: () => eventsApi.getEvents(archived),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get single event by ID
export function useEvent(id: string) {
  return useQuery({
    queryKey: eventsKeys.detail(id),
    queryFn: () => eventsApi.getEvent(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

// Get events summary statistics
export function useEventsSummary() {
  return useQuery({
    queryKey: eventsKeys.summary(),
    queryFn: eventsApi.getEventsSummary,
    staleTime: 5 * 60 * 1000,
  });
}

// Get inventory count for a specific event
export function useEventInventoryCount(id: string) {
  return useQuery({
    queryKey: eventsKeys.inventoryCount(id),
    queryFn: () => eventsApi.getEventInventoryCount(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get session statistics for a specific event
export function useEventSessionStats(id: string) {
  return useQuery({
    queryKey: ["eventSessionStats", id],
    queryFn: async () => {
      try {
        // Use the authenticated apiRequest instead of raw fetch
        const res = await apiRequest("GET", `/api/buying-desk/sessions?eventId=${id}`);
        const sessions = await res.json();
        console.log(`Event ${id} sessions:`, sessions);
        
        // Use the correct field names from SessionSummary
        const totalSessions = sessions.length;
        const soldSessions = sessions.reduce((count: number, s: any) => count + (s.soldCount || 0), 0);
        const totalRevenue = sessions.reduce((sum: number, s: any) => sum + (s.totalRevenue || 0), 0);
        
        console.log(`Event ${id} stats:`, { totalSessions, soldSessions, totalRevenue });
        return { totalSessions, soldSessions, totalRevenue };
      } catch (error) {
        console.error(`Error fetching session stats for event ${id}:`, error);
        return { totalSessions: 0, soldSessions: 0, totalRevenue: 0 };
      }
    },
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Create new event
export function useCreateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateEventData) => eventsApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      toast({
        title: "Event created",
        description: "Your event has been added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating event",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Update existing event
export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEventData }) => 
      eventsApi.updateEvent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: eventsKeys.lists() });
      queryClient.invalidateQueries({ queryKey: eventsKeys.summary() });
      // 🎯 CRITICAL: Invalidate storefront cache when event details change (name, dates, location)
      queryClient.invalidateQueries({ queryKey: ["storefront"], exact: false });
      toast({
        title: "Event updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error updating event",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Delete event
export function useDeleteEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => eventsApi.deleteEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      toast({
        title: "Event deleted",
        description: "The event has been removed.",
      });
    },
    onError: (error: any) => {
      // Check if backend is telling us to archive instead
      if (error?.shouldArchive) {
        toast({
          title: "Cannot delete event",
          description: "This event has financial data and must be archived instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error deleting event",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
  });
}

// Archive single event
export function useArchiveEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => eventsApi.archiveEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      toast({
        title: "Event archived",
        description: "The event has been archived and can be restored anytime.",
      });
    },
    onError: () => {
      toast({
        title: "Error archiving event",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Unarchive single event
export function useUnarchiveEvent() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) => eventsApi.unarchiveEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });
      toast({
        title: "Event restored",
        description: "The event has been restored to active events.",
      });
    },
    onError: () => {
      toast({
        title: "Error restoring event",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });
}

// Get purchase counts for all events (for buying desk integration)
export function useEventsPurchaseCounts() {
  return useQuery({
    queryKey: ["eventsPurchaseCounts"],
    queryFn: () => eventsApi.getPurchaseCounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Bulk archive events
export function useBulkArchiveEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (eventIds: string[]) => eventsApi.bulkArchiveEvents(eventIds),
    onSuccess: (data, eventIds) => {
      // Invalidate individual event queries for each ID
      eventIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id) });
      });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });

      // Show partial success if there were failures
      if (data.failedCount && data.failedCount > 0) {
        toast({
          title: "Partial success",
          description: `Archived ${data.archivedCount} of ${eventIds.length} event(s). ${data.failedCount} failed.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Events archived",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to archive events",
        variant: "destructive",
      });
    },
  });
}

// Bulk unarchive events
export function useBulkUnarchiveEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (eventIds: string[]) => eventsApi.bulkUnarchiveEvents(eventIds),
    onSuccess: (data, eventIds) => {
      // Invalidate individual event queries for each ID
      eventIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id) });
      });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });

      // Show partial success if there were failures
      if (data.failedCount && data.failedCount > 0) {
        toast({
          title: "Partial success",
          description: `Unarchived ${data.unarchivedCount} of ${eventIds.length} event(s). ${data.failedCount} failed.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Events unarchived",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to unarchive events",
        variant: "destructive",
      });
    },
  });
}

// Bulk delete events (only archived events)
export function useBulkDeleteEvents() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (eventIds: string[]) => eventsApi.bulkDeleteEvents(eventIds),
    onSuccess: (data, eventIds) => {
      // Invalidate individual event queries for each ID
      eventIds.forEach(id => {
        queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id) });
      });

      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: eventsKeys.all });

      // Show partial success if there were failures
      if (data.failedCount && data.failedCount > 0) {
        toast({
          title: "Partial success",
          description: `Deleted ${data.deletedCount} of ${eventIds.length} event(s). ${data.failedCount} failed.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Events deleted",
          description: data.message,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to delete events",
        variant: "destructive",
      });
    },
  });
}
