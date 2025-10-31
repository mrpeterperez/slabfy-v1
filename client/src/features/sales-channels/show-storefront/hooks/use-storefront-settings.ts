// 🤖 INTERNAL NOTE:
// Purpose: React Query hooks for storefront settings management
// Exports: useStorefrontSettings, useCreateSettings, useUpdateSettings hooks
// Feature: sales-channels/show-storefront
// Dependencies: @tanstack/react-query, storefrontApi

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storefrontApi } from "../api";
import type {
  InsertStorefrontSettings,
  UpdateStorefrontSettings,
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { TIER_2_SEMI_STATIC } from "@/lib/cache-tiers";

// Query keys for caching
export const storefrontKeys = {
  all: ["storefront"] as const,
  settings: () => [...storefrontKeys.all, "settings"] as const,
  eventSettings: (eventId: string) => [...storefrontKeys.all, "event", eventId] as const,
};

// Get global storefront settings
export function useStorefrontSettings() {
  return useQuery({
    queryKey: storefrontKeys.settings(),
    queryFn: () => storefrontApi.getSettings(),
    placeholderData: (previousData) => previousData,
    ...TIER_2_SEMI_STATIC, // Settings rarely change
  });
}

// Create initial storefront settings
export function useCreateStorefrontSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: InsertStorefrontSettings) => storefrontApi.createSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storefrontKeys.settings() });
      toast({
        title: "Settings created",
        description: "Your storefront settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Update existing storefront settings
export function useUpdateStorefrontSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: UpdateStorefrontSettings) => storefrontApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storefrontKeys.settings() });
      toast({
        title: "Settings updated",
        description: "Your storefront settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Get event-specific storefront settings
export function useEventStorefrontSettings(eventId: string) {
  return useQuery({
    queryKey: storefrontKeys.eventSettings(eventId),
    queryFn: () => storefrontApi.getEventSettings(eventId),
    enabled: !!eventId,
    placeholderData: (previousData) => previousData,
    ...TIER_2_SEMI_STATIC, // Settings rarely change
  });
}
