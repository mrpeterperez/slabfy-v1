// 🤖 INTERNAL NOTE:
// Purpose: API client for Show Storefront endpoints
// Exports: storefrontApi object with CRUD methods
// Feature: sales-channels/show-storefront
// Dependencies: apiRequest from lib, types from shared schema

import { apiRequest } from "@/lib/queryClient";
import type {
  StorefrontSettings,
  InsertStorefrontSettings,
  UpdateStorefrontSettings,
  EventStorefrontSettings,
  InsertEventStorefrontSettings,
  UpdateEventStorefrontSettings,
} from "@shared/schema";

export const storefrontApi = {
  // Global Settings
  getSettings: async (): Promise<StorefrontSettings | null> => {
    const response = await apiRequest("GET", "/api/storefront/settings");
    return response.json();
  },

  createSettings: async (data: InsertStorefrontSettings): Promise<StorefrontSettings> => {
    const response = await apiRequest("POST", "/api/storefront/settings", data);
    return response.json();
  },

  updateSettings: async (data: UpdateStorefrontSettings): Promise<StorefrontSettings> => {
    const response = await apiRequest("PUT", "/api/storefront/settings", data);
    return response.json();
  },

  // Event-Specific Settings
  getEventSettings: async (eventId: string): Promise<EventStorefrontSettings | null> => {
    const response = await apiRequest("GET", `/api/storefront/events/${eventId}/settings`);
    return response.json();
  },

  createEventSettings: async (
    eventId: string,
    data: InsertEventStorefrontSettings
  ): Promise<EventStorefrontSettings> => {
    const response = await apiRequest("POST", `/api/storefront/events/${eventId}/settings`, data);
    return response.json();
  },

  updateEventSettings: async (
    eventId: string,
    data: UpdateEventStorefrontSettings
  ): Promise<EventStorefrontSettings> => {
    const response = await apiRequest("PUT", `/api/storefront/events/${eventId}/settings`, data);
    return response.json();
  },

  deleteEventSettings: async (eventId: string): Promise<void> => {
    await apiRequest("DELETE", `/api/storefront/events/${eventId}/settings`);
  },
};
