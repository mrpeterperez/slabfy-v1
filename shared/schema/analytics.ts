// 🤖 INTERNAL NOTE:
// Purpose: Storefront analytics schema definitions
// Exports: storefrontAnalytics table + types
// Feature: sales-channels/show-storefront
// Dependencies: drizzle-orm, zod

import { pgTable, text, timestamp, uuid, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===================================
// STOREFRONT ANALYTICS
// ===================================

export const storefrontAnalytics = pgTable("storefront_analytics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  eventId: text("event_id"),
  
  // Event tracking
  eventType: text("event_type").notNull(),
  // 'page_view', 'qr_scan', 'inventory_view', 'buy_offer_created',
  // 'checkout_started', 'checkout_completed', 'cart_abandoned', 'asset_viewed'
  eventData: jsonb("event_data"),
  
  // Session tracking (anonymous customer)
  sessionId: text("session_id"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  referrer: text("referrer"),
  deviceType: text("device_type"), // 'mobile', 'tablet', 'desktop'
  
  // Conversion tracking
  assetId: text("asset_id"),
  cartValue: numeric("cart_value", { precision: 10, scale: 2 }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ===================================
// ZOD SCHEMAS & TYPES
// ===================================

export const insertStorefrontAnalyticsSchema = createInsertSchema(storefrontAnalytics).omit({
  id: true,
  createdAt: true,
});

// TypeScript Types
export type StorefrontAnalytics = typeof storefrontAnalytics.$inferSelect;
export type InsertStorefrontAnalytics = z.infer<typeof insertStorefrontAnalyticsSchema>;

// Event type options
export const analyticsEventTypeOptions = [
  "page_view",
  "qr_scan",
  "inventory_view",
  "buy_offer_created",
  "checkout_started",
  "checkout_completed",
  "cart_abandoned",
  "asset_viewed",
] as const;
export type AnalyticsEventType = (typeof analyticsEventTypeOptions)[number];

// Device type options
export const deviceTypeOptions = ["mobile", "tablet", "desktop"] as const;
export type DeviceType = (typeof deviceTypeOptions)[number];

// Event data payload types
export interface PageViewEventData {
  page: string;
  title: string;
}

export interface AssetViewEventData {
  assetId: string;
  assetTitle: string;
  price?: number;
}

export interface CheckoutEventData {
  cartItems: number;
  cartValue: number;
  paymentMethod?: string;
}

export interface BuyOfferEventData {
  assetId: string;
  offerAmount: number;
  accepted: boolean;
}
