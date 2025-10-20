// 🤖 INTERNAL NOTE:
// Purpose: Buying desk settings and counter-offers schema definitions
// Exports: buyingDeskSettings, counterOffers tables + types
// Feature: buying-desk-v0
// Dependencies: drizzle-orm, zod

import { pgTable, text, boolean, integer, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===================================
// BUYING DESK SETTINGS
// ===================================

export const buyingDeskSettings = pgTable("buying_desk_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  
  // Pricing Strategy
  defaultOfferPercentage: numeric("default_offer_percentage", { precision: 5, scale: 2 }).default("90.00"),
  pricingStrategy: text("pricing_strategy").default("below_market"), // 'below_market', 'match_market', 'custom'
  housePercentage: numeric("house_percentage", { precision: 5, scale: 2 }).default("10.00"), // House profit margin
  priceRounding: integer("price_rounding").default(5), // Round to $1, $5, or $10
  
  // Auto-Deny Rules
  autoDenyEnabled: boolean("auto_deny_enabled").default(true),
  minLiquidityLevel: text("min_liquidity_level").default("cold"), // 'fire', 'hot', 'warm', 'cool', 'cold'
  minConfidenceLevel: integer("min_confidence_level").default(40), // 0-100
  minMarketValue: numeric("min_market_value", { precision: 10, scale: 2 }).default("10.00"), // Minimum market value
  requireReviewAll: boolean("require_review_all").default(false),
  
  // Counter Offer Settings
  allowCounterOffers: boolean("allow_counter_offers").default(true),
  maxCounterRounds: integer("max_counter_rounds").default(2),
  counterExpiryHours: integer("counter_expiry_hours").default(24),
  
  // Exit Strategy
  targetFlipDays: integer("target_flip_days").default(14), // Target days to flip inventory
  minRoiPercentage: numeric("min_roi_percentage", { precision: 5, scale: 2 }).default("50.00"), // Minimum ROI %
  
  // Notification Settings
  realtimeNotifications: boolean("realtime_notifications").default(true),
  notificationEmail: text("notification_email"),
  notificationSms: text("notification_sms"),
  
  // Auto-Confirm Settings
  autoConfirmSales: boolean("auto_confirm_sales").default(false),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ===================================
// COUNTER OFFERS
// ===================================

export const counterOffers = pgTable("counter_offers", {
  id: uuid("id").primaryKey().defaultRandom(),
  buyOfferId: text("buy_offer_id").notNull(),
  assetId: text("asset_id").notNull(),
  
  // Negotiation tracking
  round: integer("round").notNull(),
  offeredBy: text("offered_by").notNull(), // 'dealer' | 'customer'
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  
  // Status
  status: text("status").default("pending"), // 'pending', 'accepted', 'rejected', 'expired'
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  
  // Response tracking
  respondedAt: timestamp("responded_at", { withTimezone: true }),
  responseBy: text("response_by"), // 'dealer' | 'customer'
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ===================================
// ZOD SCHEMAS & TYPES
// ===================================

// Buying Desk Settings
export const insertBuyingDeskSettingsSchema = createInsertSchema(buyingDeskSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBuyingDeskSettingsSchema = insertBuyingDeskSettingsSchema.partial();

// Counter Offers
export const insertCounterOfferSchema = createInsertSchema(counterOffers).omit({
  id: true,
  createdAt: true,
});

export const updateCounterOfferSchema = insertCounterOfferSchema.partial();

// TypeScript Types
export type BuyingDeskSettings = typeof buyingDeskSettings.$inferSelect;
export type InsertBuyingDeskSettings = z.infer<typeof insertBuyingDeskSettingsSchema>;
export type UpdateBuyingDeskSettings = z.infer<typeof updateBuyingDeskSettingsSchema>;

export type CounterOffer = typeof counterOffers.$inferSelect;
export type InsertCounterOffer = z.infer<typeof insertCounterOfferSchema>;
export type UpdateCounterOffer = z.infer<typeof updateCounterOfferSchema>;

// Options
export const pricingStrategyOptions = ["below_market", "match_market", "custom"] as const;
export type PricingStrategy = (typeof pricingStrategyOptions)[number];

export const liquidityLevelOptions = ["fire", "hot", "warm", "cool", "cold"] as const;
export type LiquidityLevel = (typeof liquidityLevelOptions)[number];

export const counterOfferStatusOptions = ["pending", "accepted", "rejected", "expired"] as const;
export type CounterOfferStatus = (typeof counterOfferStatusOptions)[number];

export const offeredByOptions = ["dealer", "customer"] as const;
export type OfferedBy = (typeof offeredByOptions)[number];
