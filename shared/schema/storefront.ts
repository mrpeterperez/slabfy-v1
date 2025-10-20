// 🤖 INTERNAL NOTE:
// Purpose: Storefront and event storefront schema definitions
// Exports: storefrontSettings, eventStorefrontSettings, storefrontCartHolds tables + types
// Feature: sales-channels/show-storefront
// Dependencies: drizzle-orm, zod

import { pgTable, text, boolean, integer, timestamp, uuid, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ===================================
// STOREFRONT SETTINGS (GLOBAL)
// ===================================

export const storefrontSettings = pgTable("storefront_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  
  // General Settings
  storeLogo: text("store_logo"),
  storeName: text("store_name").notNull(),
  description: text("description"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  welcomeMessage: text("welcome_message"),
  eventDateText: text("event_date_text"), // Custom date text with placeholders
  eventLocationText: text("event_location_text"), // Custom location text with placeholders
  
  // Customer Actions (feature toggles)
  enableInventory: boolean("enable_inventory").default(true),
  enableBuyingDesk: boolean("enable_buying_desk").default(true),
  enablePriceChecker: boolean("enable_price_checker").default(true),
  
  // Design
  coverImage: text("cover_image"),
  fontStyle: text("font_style").default("Inter"), // Body font
  headingFont: text("heading_font").default("Bebas Neue"), // Heading font
  headingFontColor: text("heading_font_color").default("#000000"), // Heading font color (light)
  bodyFontColor: text("body_font_color").default("#000000"), // Body font color (light)
  
  // Light mode colors
  primaryColor: text("primary_color").default("#037C85"),
  accentColor: text("accent_color").default("#037C85"),
  backgroundColor: text("background_color").default("#ffffff"),
  textColor: text("text_color").default("#000000"),
  
  // Dark mode colors
  primaryColorDark: text("primary_color_dark").default("#0aa5b0"),
  accentColorDark: text("accent_color_dark").default("#0aa5b0"),
  backgroundColorDark: text("background_color_dark").default("#0a0a0a"),
  textColorDark: text("text_color_dark").default("#ffffff"),
  headingFontColorDark: text("heading_font_color_dark").default("#ffffff"), // Heading font color (dark)
  bodyFontColorDark: text("body_font_color_dark").default("#ffffff"), // Body font color (dark)
  
  // Theme mode ('light', 'dark', 'auto')
  themeMode: text("theme_mode").default("light"),
  
  buttonRadius: integer("button_radius").default(16),
  qrCodeColor: text("qr_code_color").default("#000000"),
  
  // POS Configuration
  autoConfirmSales: boolean("auto_confirm_sales").default(false),
  defaultHoldMinutes: integer("default_hold_minutes").default(10),
  enableCartHolds: boolean("enable_cart_holds").default(true),
  qrCodeLogoOverlay: boolean("qr_code_logo_overlay").default(true),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ===================================
// EVENT STOREFRONT SETTINGS (OVERRIDES)
// ===================================

export const eventStorefrontSettings = pgTable("event_storefront_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull(),
  userId: text("user_id").notNull(),
  
  // Override flags
  overrideStoreLogo: boolean("override_store_logo").default(false),
  overrideStoreName: boolean("override_store_name").default(false),
  overrideDescription: boolean("override_description").default(false),
  overrideContactPhone: boolean("override_contact_phone").default(false),
  overrideContactEmail: boolean("override_contact_email").default(false),
  overrideWelcomeMessage: boolean("override_welcome_message").default(false),
  overrideCoverImage: boolean("override_cover_image").default(false),
  overrideFontStyle: boolean("override_font_style").default(false),
  overridePrimaryColor: boolean("override_primary_color").default(false),
  overrideAccentColor: boolean("override_accent_color").default(false),
  overrideBackgroundColor: boolean("override_background_color").default(false),
  overrideTextColor: boolean("override_text_color").default(false),
  overridePrimaryColorDark: boolean("override_primary_color_dark").default(false),
  overrideAccentColorDark: boolean("override_accent_color_dark").default(false),
  overrideBackgroundColorDark: boolean("override_background_color_dark").default(false),
  overrideTextColorDark: boolean("override_text_color_dark").default(false),
  overrideThemeMode: boolean("override_theme_mode").default(false),
  overrideButtonRadius: boolean("override_button_radius").default(false),
  
  // Override values
  storeLogo: text("store_logo"),
  storeName: text("store_name"),
  description: text("description"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  welcomeMessage: text("welcome_message"),
  coverImage: text("cover_image"),
  fontStyle: text("font_style"),
  primaryColor: text("primary_color"),
  accentColor: text("accent_color"),
  backgroundColor: text("background_color"),
  textColor: text("text_color"),
  primaryColorDark: text("primary_color_dark"),
  accentColorDark: text("accent_color_dark"),
  backgroundColorDark: text("background_color_dark"),
  textColorDark: text("text_color_dark"),
  themeMode: text("theme_mode"),
  buttonRadius: integer("button_radius"),
  
  // Event-specific fields
  tableNumber: text("table_number"),
  specialInstructions: text("special_instructions"),
  
  // Customer action overrides
  overrideEnableInventory: boolean("override_enable_inventory").default(false),
  overrideEnableBuyingDesk: boolean("override_enable_buying_desk").default(false),
  overrideEnablePriceChecker: boolean("override_enable_price_checker").default(false),
  enableInventory: boolean("enable_inventory"),
  enableBuyingDesk: boolean("enable_buying_desk"),
  enablePriceChecker: boolean("enable_price_checker"),
  
  // Publish status
  isLive: boolean("is_live").default(false),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ===================================
// STOREFRONT CART HOLDS
// ===================================

export const storefrontCartHolds = pgTable("storefront_cart_holds", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull(),
  assetId: text("asset_id").notNull(),
  
  // Session tracking
  sessionId: text("session_id").notNull(),
  
  // Hold configuration
  holdMinutes: integer("hold_minutes").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  
  // Status
  status: text("status").default("active"), // 'active', 'expired', 'completed', 'cancelled'
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ===================================
// STOREFRONT ORDERS
// ===================================

export const storefrontOrders = pgTable("storefront_orders", {
  id: text("id").primaryKey().notNull(),
  userId: text("user_id").notNull(),
  eventId: text("event_id"),
  
  // Customer contact info
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone"),
  
  // Order details
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  itemCount: integer("item_count").notNull().default(0),
  
  // Order status
  status: text("status").notNull().default("pending"), // pending | contacted | confirmed | completed | cancelled
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  contactedAt: timestamp("contacted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  
  // Notes
  notes: text("notes"),
});

// ===================================
// STOREFRONT ORDER ITEMS
// ===================================

export const storefrontOrderItems = pgTable("storefront_order_items", {
  id: text("id").primaryKey().notNull(),
  orderId: text("order_id").notNull(),
  globalAssetId: text("global_asset_id").notNull(),
  eventInventoryId: text("event_inventory_id"),
  
  // Item pricing at time of order
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ===================================
// ZOD SCHEMAS & TYPES
// ===================================

// Storefront Settings
export const insertStorefrontSettingsSchema = createInsertSchema(storefrontSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateStorefrontSettingsSchema = insertStorefrontSettingsSchema.partial();

// Event Storefront Settings
export const insertEventStorefrontSettingsSchema = createInsertSchema(eventStorefrontSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEventStorefrontSettingsSchema = insertEventStorefrontSettingsSchema.partial();

// Cart Holds
export const insertStorefrontCartHoldSchema = createInsertSchema(storefrontCartHolds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateStorefrontCartHoldSchema = insertStorefrontCartHoldSchema.partial();

// TypeScript Types
export type StorefrontSettings = typeof storefrontSettings.$inferSelect;
export type InsertStorefrontSettings = z.infer<typeof insertStorefrontSettingsSchema>;
export type UpdateStorefrontSettings = z.infer<typeof updateStorefrontSettingsSchema>;

export type EventStorefrontSettings = typeof eventStorefrontSettings.$inferSelect;
export type InsertEventStorefrontSettings = z.infer<typeof insertEventStorefrontSettingsSchema>;
export type UpdateEventStorefrontSettings = z.infer<typeof updateEventStorefrontSettingsSchema>;

export type StorefrontCartHold = typeof storefrontCartHolds.$inferSelect;
export type InsertStorefrontCartHold = z.infer<typeof insertStorefrontCartHoldSchema>;
export type UpdateStorefrontCartHold = z.infer<typeof updateStorefrontCartHoldSchema>;

// Status options
export const cartHoldStatusOptions = ["active", "expired", "completed", "cancelled"] as const;
export type CartHoldStatus = (typeof cartHoldStatusOptions)[number];

// Storefront Orders
export const insertStorefrontOrderSchema = createInsertSchema(storefrontOrders).omit({
  id: true,
  createdAt: true,
});

export const updateStorefrontOrderSchema = insertStorefrontOrderSchema.partial();

export type StorefrontOrder = typeof storefrontOrders.$inferSelect;
export type InsertStorefrontOrder = z.infer<typeof insertStorefrontOrderSchema>;
export type UpdateStorefrontOrder = z.infer<typeof updateStorefrontOrderSchema>;

// Storefront Order Items
export const insertStorefrontOrderItemSchema = createInsertSchema(storefrontOrderItems).omit({
  id: true,
  createdAt: true,
});

export type StorefrontOrderItem = typeof storefrontOrderItems.$inferSelect;
export type InsertStorefrontOrderItem = z.infer<typeof insertStorefrontOrderItemSchema>;

// Order status options
export const storefrontOrderStatusOptions = ["pending", "contacted", "confirmed", "completed", "cancelled"] as const;
export type StorefrontOrderStatus = (typeof storefrontOrderStatusOptions)[number];
