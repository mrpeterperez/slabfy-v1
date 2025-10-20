// 🤖 INTERNAL NOTE:
// Purpose: TypeScript definitions for events feature
// Exports: Event, EventStatus, EventMetrics, CreateEventData
// Feature: events
// Dependencies: shared/schema

import { Event as BaseEvent, EventStatus, InsertEvent, UpdateEvent } from "@shared/schema";

// Re-export base types from schema
export type { EventStatus } from "@shared/schema";
export type CreateEventData = InsertEvent;
export type UpdateEventData = UpdateEvent;

// Extended Event type that includes computed stats from API
export type Event = BaseEvent & {
  soldCount?: number;
  revenue?: number;
  purchasedCount?: number;
  purchasedTotal?: number;
};

// UI-specific types for event metrics (placeholder for future integration)
export interface EventMetrics {
  totalBuyOffers: number;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
  avgOffer: number;
  conversionRate: number;
}

// Default metrics for events without connected data
export const defaultEventMetrics: EventMetrics = {
  totalBuyOffers: 0,
  totalSold: 0,
  totalRevenue: 0,
  totalProfit: 0,
  avgOffer: 0,
  conversionRate: 0,
};

// Event list summary for overview cards
export interface EventsSummary {
  totalEvents: number;
  totalBuyOffers: number;
  totalSold: number;
  totalRevenue: number;
  totalProfit: number;
}

// Status display configuration
export const statusConfig = {
  upcoming: { label: "Upcoming", variant: "secondary" as const },
  active: { label: "Live Now", variant: "default" as const },
  completed: { label: "Completed", variant: "outline" as const },
  cancelled: { label: "Cancelled", variant: "destructive" as const },
};

// Event form data for creation/editing
export interface EventFormData {
  name: string;
  dateStart: string;
  dateEnd?: string;
  location?: string;
  description?: string;
}