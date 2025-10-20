// 🤖 INTERNAL NOTE:
// Purpose: API client for events CRUD operations
// Exports: eventsApi object with all API methods
// Feature: events
// Dependencies: @/lib/api-request, events types

import { apiRequest } from "@/lib/queryClient";
import { Event, CreateEventData, UpdateEventData, EventsSummary } from "./types/event-types";

export const eventsApi = {
  // Get all events for current user
  getEvents: async (archived?: boolean): Promise<Event[]> => {
    let url = "/api/events";
    if (archived !== undefined) {
      url += `?archived=${archived}`;
    }
    const response = await apiRequest("GET", url);
    return response.json();
  },

  // Get single event by ID
  getEvent: async (id: string): Promise<Event> => {
    const response = await apiRequest("GET", `/api/events/${id}`);
    return response.json();
  },

  // Create new event
  createEvent: async (data: CreateEventData): Promise<Event> => {
    const response = await apiRequest("POST", "/api/events", data);
    return response.json();
  },

  // Update existing event
  updateEvent: async (id: string, data: UpdateEventData): Promise<Event> => {
    const response = await apiRequest("PATCH", `/api/events/${id}`, data);
    return response.json();
  },

  // Delete event
  deleteEvent: async (id: string): Promise<void> => {
    const response = await apiRequest("DELETE", `/api/events/${id}`);
    // Check if backend returned error about financial data
    if (!response.ok) {
      const error = await response.json();
      throw error; // Will include shouldArchive flag if present
    }
  },

  // Archive single event
  archiveEvent: async (id: string): Promise<Event> => {
    const response = await apiRequest("PATCH", `/api/events/${id}/archive`);
    return response.json();
  },

  // Unarchive single event
  unarchiveEvent: async (id: string): Promise<Event> => {
    const response = await apiRequest("PATCH", `/api/events/${id}/unarchive`);
    return response.json();
  },

  // Get summary statistics for all events
  getEventsSummary: async (): Promise<EventsSummary> => {
    const response = await apiRequest("GET", "/api/events/summary");
    return response.json();
  },

  // Get inventory count for an event (lightweight helper)
  getEventInventoryCount: async (id: string): Promise<number> => {
    const response = await apiRequest("GET", `/api/events/${id}/inventory`);
    const items = await response.json();
    return Array.isArray(items) ? items.length : 0;
  },

  // Get purchase counts for all events (for buying desk integration)
  getPurchaseCounts: async (): Promise<Record<string, number>> => {
    const response = await apiRequest("GET", "/api/events/purchase-counts");
    return response.json();
  },

  // Bulk archive events
  bulkArchiveEvents: async (eventIds: string[]): Promise<{
    success: boolean;
    archivedCount: number;
    failedCount?: number;
    errors?: Array<{ id: string; error: string }>;
    message: string;
  }> => {
    const response = await apiRequest("PATCH", "/api/events/bulk/archive", { eventIds });
    return response.json();
  },

  // Bulk unarchive events
  bulkUnarchiveEvents: async (eventIds: string[]): Promise<{
    success: boolean;
    unarchivedCount: number;
    failedCount?: number;
    errors?: Array<{ id: string; error: string }>;
    message: string;
  }> => {
    const response = await apiRequest("PATCH", "/api/events/bulk/unarchive", { eventIds });
    return response.json();
  },

  // Bulk delete events (only archived events can be deleted)
  bulkDeleteEvents: async (eventIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    failedCount?: number;
    errors?: Array<{ id: string; error: string }>;
    message: string;
  }> => {
    const response = await apiRequest("DELETE", "/api/events/bulk/delete", { eventIds });
    return response.json();
  },
};