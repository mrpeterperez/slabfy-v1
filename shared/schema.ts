import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  boolean,
  integer,
  numeric,
  date,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(), // Using text for UUID compatibility with Supabase
  email: text("email").notNull().unique(),
  username: text("username").unique(),
  name: text("name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  collections: jsonb("collections").$type<string[]>(),
  // Arbitrary user preferences blob (UI settings, feature flags, etc.)
  preferences: jsonb("preferences").$type<Record<string, any>>(),
  onboardingComplete: text("onboarding_complete").default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  username: true,
});

export const collectionOptions = [
  "Sports Cards",
  "TCG",
  "Comics",
  "Other",
] as const;

export type CollectionType = (typeof collectionOptions)[number];

export const updateUserCollectionsSchema = z.object({
  collections: z.array(z.enum(collectionOptions)).min(1),
});

export const usernameSchema = z.string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username cannot exceed 20 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
  .transform(val => val.toLowerCase());

// Invite Codes - Secure registration control
export const inviteCodes = pgTable("invite_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  createdBy: text("created_by").references(() => users.id), // Nullable for CLI-generated codes
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  usedAt: timestamp("used_at"),
  usedBy: text("used_by").references(() => users.id),
  maxUses: integer("max_uses").default(1),
  currentUses: integer("current_uses").default(0),
  isActive: boolean("is_active").default(true),
  note: text("note"),
});

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({
  id: true,
  createdAt: true,
  currentUses: true,
});

export type InviteCode = typeof inviteCodes.$inferSelect;
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;



// Global Assets - Master list of all cards across all users
export const globalAssets = pgTable("global_assets", {
  id: text("id").primaryKey(), // UUID for global asset
  
  // Core card identification
  type: text("type").notNull(), // "graded", "raw", "sealed", etc.
  grader: text("grader"), // "PSA", "BGS", "SGC", null for raw
  certNumber: text("cert_number"), // PSA cert, BGS cert, etc.
  cardId: text("card_id"), // Groups identical cards across different certificates
  
  // Card details
  playerName: text("player_name"),
  setName: text("set_name"), 
  year: text("year"),
  cardNumber: text("card_number"),
  variant: text("variant"),
  grade: text("grade"),
  
  // PSA Images
  psaImageFrontUrl: text("psa_image_front_url"),
  psaImageBackUrl: text("psa_image_back_url"),
  
  // User uploaded images
  assetImages: jsonb("asset_images").$type<string[]>(),
  
  // PSA Population Data
  totalPopulation: integer("total_population"),
  totalPopulationWithQualifier: integer("total_population_with_qualifier"),
  populationHigher: integer("population_higher"),
  
  // PSA Authentication Data
  isPsaDna: boolean("is_psa_dna").default(false),
  isDualCert: boolean("is_dual_cert").default(false),
  autographGrade: text("autograph_grade"),
  
  // Market tracking
  liquidityRating: text("liquidity_rating").default("cold"), // fire, hot, warm, cool, cold
  lastApiCall: timestamp("last_api_call"),
  nextApiCall: timestamp("next_api_call"),
  aiFiltered: boolean("ai_filtered").default(false), // Track if data has been AI-filtered
  lastPricingUpdate: timestamp("last_pricing_update"), // Track when pricing was last fetched (for auto-refresh)
  
  // Card deduplication
  fingerprint: text("fingerprint"), // Normalized card identifier for deduplication (player|set|year|number|variant|grade|grader)
  
  // Metadata
  title: text("title"),
  category: text("category"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sales History - Individual sale records linked to global assets
export const salesHistory = pgTable("sales_history", {
  id: text("id").primaryKey(),
  global_asset_id: text("global_asset_id").notNull().references(() => globalAssets.id),
  card_id: text("card_id"), // Groups sales by card type for consistent data across identical cards
  
  // Sale details
  title: text("title").notNull(),
  final_price: numeric("final_price", { precision: 10, scale: 2 }),
  listing_price: numeric("listing_price", { precision: 10, scale: 2 }),
  shipping: numeric("shipping", { precision: 10, scale: 2 }),
  
  // Sale metadata
  sold_date: timestamp("sold_date"),
  condition: text("condition"),
  marketplace: text("marketplace").default("ebay"),
  listing_type: text("listing_type"), // auction, fixed_price, best_offer
  
  // Seller info
  seller_name: text("seller_name"),
  seller_feedback: integer("seller_feedback"),
  seller_rating: numeric("seller_rating", { precision: 4, scale: 1 }),
  
  // URLs and images
  listing_url: text("listing_url"),
  image_url: text("image_url"),
  
  // Data source tracking
  source_api_call: timestamp("source_api_call").defaultNow(),
  
  // AI-Enhanced Filtering (V2 Pipeline)
  relevance_score: integer("relevance_score"), // Rule-based score (0-100)
  ai_confidence: integer("ai_confidence"), // AI confidence score (0-100)
  ai_reasoning: text("ai_reasoning"), // AI explanation
  quality_score: integer("quality_score"), // Combined quality score (0-100)
  filter_method: text("filter_method"), // 'rules-only' | 'ai-enhanced'
  
  // Verified Sales Tracking System
  source: text("source").default("ebay").notNull(), // 'ebay' | 'slabfy_credit_card' | 'slabfy_cash'
  verified: boolean("verified").default(true).notNull(), // Credit card/eBay = verified, Cash = unverified
  user_id: text("user_id"), // PRIVATE: For analytics only - NEVER display publicly
  payment_method: text("payment_method"), // PRIVATE: For records only - NEVER display publicly
  
  // Timestamps
  created_at: timestamp("created_at").defaultNow(),
});

// User Sales Log - Private analytics tracking for manual sales (never affects public pricing)
export const userSalesLog = pgTable("user_sales_log", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  globalAssetId: text("global_asset_id").notNull().references(() => globalAssets.id),
  
  // Sale details
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull(),
  saleDate: timestamp("sale_date").notNull(),
  platform: text("platform").notNull(), // 'ebay' | 'cash' | 'check' | 'digital' | 'trade' | 'other'
  
  // Purchase context (for profit/ROI calculations)
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  purchaseDate: date("purchase_date"),
  purchaseSource: text("purchase_source"),
  
  // Calculated metrics
  profit: numeric("profit", { precision: 10, scale: 2 }),
  roi: numeric("roi", { precision: 5, scale: 2 }),
  
  // Optional details
  notes: text("notes"),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User Assets - Junction table linking users to their owned assets
export const userAssets = pgTable("user_assets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  globalAssetId: text("global_asset_id").notNull().references(() => globalAssets.id),
  
  // User-specific data
  personalValue: numeric("personal_value", { precision: 10, scale: 2 }),
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
  marketPriceAtPurchase: numeric("market_price_at_purchase", { precision: 10, scale: 2 }),
  purchaseDate: date("purchase_date"),
  purchaseSource: text("purchase_source"),
  buyOfferId: text("buy_offer_id"), // Links to buying session if purchased via SlabFy buying desk
  notes: text("notes"),
  
  // Ownership information
  ownershipStatus: text("ownership_status").default("own"), // "own" | "consignment" | "sold"
  
  // Sale tracking fields
  soldAt: timestamp("sold_at"),
  soldTo: text("sold_to"), // Contact ID or User ID who purchased
  soldPrice: numeric("sold_price", { precision: 10, scale: 2 }),
  
  // Serial number information (specific to this physical card)
  serialNumbered: boolean("serial_numbered").default(false),
  serialNumber: integer("serial_number"),
  serialMax: integer("serial_max"),
  
  // User organization
  tags: jsonb("tags").$type<string[]>(),
  favorited: boolean("favorited").default(false),
  
  // Consignment-specific fields
  reservePrice: numeric("reserve_price", { precision: 10, scale: 2 }),
  splitPercentage: numeric("split_percentage", { precision: 5, scale: 2 }),
  status: text("status").default("Draft"), // Draft, Active, On Hold, Sold, Returned
  listedAt: timestamp("listed_at"),
  
  // Soft delete support
  isActive: boolean("is_active").default(true),
  removedAt: timestamp("removed_at"),
  
  // Timestamps
  addedAt: timestamp("added_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema types and validators
export const insertGlobalAssetSchema = createInsertSchema(globalAssets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSalesHistorySchema = createInsertSchema(salesHistory).omit({
  id: true,
  created_at: true,
});

export const insertUserSalesLogSchema = createInsertSchema(userSalesLog).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserAssetSchema = createInsertSchema(userAssets).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

export type GlobalAsset = typeof globalAssets.$inferSelect;
export type InsertGlobalAsset = z.infer<typeof insertGlobalAssetSchema>;

export type SalesHistory = typeof salesHistory.$inferSelect;
export type InsertSalesHistory = z.infer<typeof insertSalesHistorySchema>;

export type UserSalesLog = typeof userSalesLog.$inferSelect;
export type InsertUserSalesLog = z.infer<typeof insertUserSalesLogSchema>;

export type UserAsset = typeof userAssets.$inferSelect;
export type InsertUserAsset = z.infer<typeof insertUserAssetSchema>;

// Liquidity rating enum for validation
export const liquidityRatingSchema = z.enum(["fire", "hot", "warm", "cool", "cold"]);

export const userProfileSchema = z.object({
  name: z.string().optional().describe("User's display name"),
  bio: z.string().optional().describe("User's biography text"),
  avatarUrl: z.string().url().optional().nullable().describe("URL to user's avatar image"),
});

// For updating the entire profile (PUT)
export const updateProfileSchema = userProfileSchema;

// For partial profile updates (PATCH)
export const patchProfileSchema = userProfileSchema.partial();

// Asset related schemas and types

export const assetTypeOptions = ["graded", "raw", "sealed", "other"] as const;

export type AssetType = (typeof assetTypeOptions)[number];

export const graderOptions = ["PSA", "BGS", "CGC", "SGC", "TAG", "Other"] as const;

export type Grader = (typeof graderOptions)[number];

export const ownershipStatusOptions = ["own", "consignment", "sold"] as const;

export type OwnershipStatus = (typeof ownershipStatusOptions)[number];

export const assetStatusOptions = ["for_sale", "not_for_sale", "sold"] as const;

export type AssetStatus = (typeof assetStatusOptions)[number];

export const sourceSlugOptions = ["psa", "bgs", "manual"] as const;

export type SourceSlug = (typeof sourceSlugOptions)[number];

// Legacy assets table removed - now using user_assets + global_assets architecture

// Legacy assets schema (simplified for compatibility)
export const insertAssetSchema = z.object({
  userId: z.string().optional(),
  type: z.enum(assetTypeOptions),
  title: z.string(),
  playerName: z.string().optional().nullable(),
  setName: z.string().optional().nullable(),
  year: z.string().optional().nullable(),
  cardNumber: z.string().optional().nullable(),
  variant: z.string().optional().nullable(),
  grader: z.enum(graderOptions).optional().nullable(),
  grade: z.string().optional().nullable(),
  certNumber: z.string().optional().nullable(),
  purchasePrice: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const num = parseFloat(val);
        return isNaN(num) ? null : num;
      }
      return typeof val === 'number' ? val : null;
    },
    z.number().optional().nullable()
  ),
  purchaseDate: z.string().optional().nullable(),
  purchaseSource: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  serialNumbered: z.boolean().optional().nullable(),
  serialNumber: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? null : num;
      }
      return typeof val === 'number' ? val : null;
    },
    z.number().optional().nullable()
  ),
  serialMax: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return null;
      if (typeof val === 'string') {
        const num = parseInt(val, 10);
        return isNaN(num) ? null : num;
      }
      return typeof val === 'number' ? val : null;
    },
    z.number().optional().nullable()
  ),
  ownershipStatus: z.enum(ownershipStatusOptions).optional(),
  assetStatus: z.enum(assetStatusOptions).optional(),
  sourceSlug: z.enum(sourceSlugOptions).optional(),
  imageUrl: z.string().optional().nullable(),
  assetImages: z.array(z.string().url()).optional().nullable()
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type PatchProfile = z.infer<typeof patchProfileSchema>;
// Legacy Asset types (kept for compatibility with old code)
export type Asset = {
  id: string;
  userId: string;
  type: AssetType;
  title: string;
  playerName?: string | null;
  setName?: string | null;
  year?: string | null;
  cardNumber?: string | null;
  variant?: string | null;
  grader?: Grader | null;
  grade?: string | null;
  certNumber?: string | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  purchaseSource?: string | null;
  buyOfferId?: string | null; // SlabFy buying desk session ID if purchased via checkout
  notes?: string | null;
  serialNumbered?: boolean | null;
  serialNumber?: number | null;
  serialMax?: number | null;
  ownershipStatus?: OwnershipStatus | null;
  assetStatus?: AssetStatus | null;
  sourceSlug?: SourceSlug | null;
  imageUrl?: string | null;
  assetImages?: string[] | null;
  consignmentId?: string | null; // For consignment assets
  // Sale tracking fields
  soldAt?: Date | string | null;
  soldTo?: string | null;
  soldPrice?: string | number | null;
  createdAt?: Date;
  updatedAt?: Date;
  // PSA data
  category?: string | null;
  psaImageFrontUrl?: string | null;
  psaImageBackUrl?: string | null;
  totalPopulation?: number | null;
  totalPopulationWithQualifier?: number | null;
  populationHigher?: number | null;
  isPsaDna?: boolean | null;
  isDualCert?: boolean | null;
  autographGrade?: string | null;
  globalAssetId?: string;
};
export type InsertAsset = z.infer<typeof insertAssetSchema>;

// PSA Certificate Cache for reducing API calls
export const psaCertCache = pgTable("psa_cert_cache", {
  id: serial("id").primaryKey(),
  certNumber: text("cert_number").notNull().unique(),
  rawData: jsonb("raw_data").notNull(), // Original PSA API response
  frontImageUrl: text("front_image_url"),
  backImageUrl: text("back_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPsaCertCacheSchema = createInsertSchema(psaCertCache)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertPsaCertCache = z.infer<typeof insertPsaCertCacheSchema>;
export type PsaCertCache = typeof psaCertCache.$inferSelect;

// Historical Sales Records - Individual sale transactions
export const salesRecords = pgTable("sales_records", {
  id: serial("id").primaryKey(),
  cardIdentifier: text("card_identifier").notNull(), // Normalized search term
  ebayListingId: text("ebay_listing_id").unique(), // eBay item ID for deduplication
  title: text("title").notNull(),
  finalPrice: numeric("final_price").notNull(),
  shippingCost: numeric("shipping_cost").default("0"),
  totalPrice: numeric("total_price").notNull(), // finalPrice + shipping
  saleDate: timestamp("sale_date").notNull(),
  condition: text("condition"),
  listingType: text("listing_type"), // auction, buy_it_now, etc.
  marketplace: text("marketplace").default("ebay"),
  sellerName: text("seller_name"),
  sellerFeedback: integer("seller_feedback"),
  bidCount: integer("bid_count"),
  imageUrl: text("image_url"),
  listingUrl: text("listing_url"),
  rawData: jsonb("raw_data"), // Original API response for this sale
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales Fetch Tracking - When we last pulled data for each card
export const salesFetches = pgTable("sales_fetches", {
  id: serial("id").primaryKey(),
  cardIdentifier: text("card_identifier").notNull().unique(),
  lastFetchAt: timestamp("last_fetch_at").notNull(),
  lastSaleDate: timestamp("last_sale_date"), // Most recent sale found
  refreshCount: integer("refresh_count").default(1),
  marketActivity: text("market_activity").default("unknown"), // active, slow, dead
  apiCallsToday: integer("api_calls_today").default(1),
  lastApiCallDate: date("last_api_call_date").notNull(),
  totalSalesFound: integer("total_sales_found").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSalesRecordSchema = createInsertSchema(salesRecords)
  .omit({ id: true, createdAt: true });

export const insertSalesFetchSchema = createInsertSchema(salesFetches)
  .omit({ id: true, createdAt: true, updatedAt: true });

export type InsertSalesRecord = z.infer<typeof insertSalesRecordSchema>;
export type SalesRecord = typeof salesRecords.$inferSelect;
export type InsertSalesFetch = z.infer<typeof insertSalesFetchSchema>;
export type SalesFetch = typeof salesFetches.$inferSelect;

// Pricing-related types and schemas
export type PricePoint = {
  value: number;
  currency: string;
  min?: number;
  max?: number;
  median?: number;
  mean?: number;
  timestamp?: string;
};

export type ConfidenceRating = {
  rating: 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  factors: string[];
};

export type PricingInfo = PricePoint & {
  sampleSize: number;
  source: string;
};

export type EbayComp = {
  title: string;
  price: number;
  saleDate: string;
  imageUrl?: string;
  itemUrl?: string;
  similarity?: number;
};

// Card shows table for storing Perplexity-discovered events
export const cardShows = pgTable("card_shows", {
  id: text("id").primaryKey(), // UUID for consistency with other tables
  name: varchar("name", { length: 255 }).notNull(),
  dateStart: date("date_start").notNull(),
  dateEnd: date("date_end"), // nullable for single day events
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  website: text("website"),
  description: text("description"), // Brief description of the event
  venueName: text("venue_name"), // Venue name when available
  fetchedAt: timestamp("fetched_at").defaultNow(),
  isActive: boolean("is_active").default(true), // for soft delete
});

// Events table for user's personal event management
export const events = pgTable("events", {
  id: text("id").primaryKey(), // UUID for consistency with other tables
  userId: text("user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  dateStart: date("date_start").notNull(),
  dateEnd: date("date_end"), // nullable for single day events
  location: text("location"),
  description: text("description"),
  logoUrl: text("logo_url"), // Event logo URL
  aiInsights: jsonb("ai_insights").$type<string[]>(), // Perplexity-generated tips
  status: varchar("status", { length: 50 }).default("upcoming"), // User-controlled lifecycle: upcoming, live, completed, cancelled
  isCustom: boolean("is_custom").default(false), // true if manually created vs discovered
  cardShowId: text("card_show_id").references(() => cardShows.id), // reference to card show if based on one
  archived: boolean("archived").default(false).notNull(), // System-controlled visibility: false = active, true = archived
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp for audit trail
  
  // Storefront fields (multi-event storefront support)
  storefrontEnabled: boolean("storefront_enabled").default(false),
  storefrontQrCodeUrl: text("storefront_qr_code_url"),
  storefrontLastGeneratedAt: timestamp("storefront_last_generated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Event schema types and validators
export const eventStatusOptions = ["upcoming", "live", "completed", "cancelled"] as const;
export type EventStatus = (typeof eventStatusOptions)[number];

// Card show schema types and validators
export const insertCardShowSchema = createInsertSchema(cardShows).omit({
  id: true,
  fetchedAt: true,
});

export type CardShow = typeof cardShows.$inferSelect;
export type InsertCardShow = z.infer<typeof insertCardShowSchema>;

// Event schema types and validators
export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEventSchema = insertEventSchema.partial();

export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type UpdateEvent = z.infer<typeof updateEventSchema>;

// Event Inventory - Assets attached to an event/show
export const eventInventory = pgTable(
  "event_inventory",
  {
    id: text("id").primaryKey().notNull(), // UUID
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    globalAssetId: text("global_asset_id").notNull().references(() => globalAssets.id, { onDelete: "cascade" }),
    // Optional metadata for show pricing/notes
    sourceType: text("source_type"), // "portfolio" | "consignment" | "collection"
    askingPrice: numeric("asking_price", { precision: 10, scale: 2 }),
    costBasis: numeric("cost_basis", { precision: 10, scale: 2 }),
    status: text("status").default("available"), // available, pending, sold, removed
    notes: text("notes"),
    qty: integer("qty").default(1),
    addedAt: timestamp("added_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    evAssetUnique: uniqueIndex("event_inventory_event_asset_uniq").on(t.eventId, t.globalAssetId),
  })
);

export const insertEventInventorySchema = createInsertSchema(eventInventory).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

export const updateEventInventorySchema = insertEventInventorySchema.partial();

export type EventInventoryItem = typeof eventInventory.$inferSelect;
export type InsertEventInventory = z.infer<typeof insertEventInventorySchema>;
export type UpdateEventInventory = z.infer<typeof updateEventInventorySchema>;

// Buy Mode - Contact Management System

// Master contacts table - all contact information lives here
export const contacts = pgTable("contacts", {
  id: text("id").primaryKey().notNull(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  companyName: text("company_name"),
  notes: text("notes"),
  // Storefront integration fields - track contact source and address for shipping
  source: text("source").default("manual"), // 'manual', 'storefront_customer', 'event_customer', 'buying_desk'
  sourceEventId: text("source_event_id"), // Event ID if source is event-related
  mailingAddress: text("mailing_address"), // Street address for storefront purchases
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  country: text("country").default("US"),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint: one email per user (business-grade approach)
  userEmailUnique: uniqueIndex("contacts_user_email_unique").on(table.userId, table.email)
    .where(sql`${table.email} IS NOT NULL AND ${table.archived} = false`)
}));

// Sellers table - references contacts table
export const sellers = pgTable("sellers", {
  id: text("id").primaryKey().notNull(), // UUID
  contactId: text("contact_id").notNull().references(() => contacts.id),
  userId: text("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buyers table - references contacts table (future use)
export const buyers = pgTable("buyers", {
  id: text("id").primaryKey().notNull(), // UUID
  contactId: text("contact_id").notNull().references(() => contacts.id),
  userId: text("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Buy sessions table - main session management (formerly buy offers)
export const buyOffers = pgTable("buy_offers", {
  id: text("id").primaryKey().notNull(), // UUID
  offerNumber: text("offer_number").notNull().unique(), // Sequential format (BUY-2025-001)
  userId: text("user_id").notNull().references(() => users.id),
  sellerId: text("seller_id").references(() => sellers.id), // Allow null for new sessions
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }), // Optional - show context
  status: text("status").notNull().default("active"), // Simplified: 'active' | 'closed' (80/20 rule)
  notes: text("notes"),
  archived: boolean("archived").default(false).notNull(), // Visibility state (separate from status)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  respondedAt: timestamp("responded_at"),
  expiresAt: timestamp("expires_at"),
});

// Evaluation Assets table - tracks assets being evaluated before final offer
export const evaluationAssets = pgTable("buy_offer_evaluation_assets", {
  id: text("id").primaryKey().notNull(), // UUID
  buyOfferId: text("buy_offer_id").notNull().references(() => buyOffers.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull().references(() => globalAssets.id, { onDelete: "cascade" }),
  evaluationNotes: text("evaluation_notes"), // Notes during evaluation
  addedAt: timestamp("added_at").defaultNow(),
});

// Buy List Cart table - tracks assets included in final offers (buy list)
export const buyListCart = pgTable("buy_offer_assets", {
  id: text("id").primaryKey().notNull(), // UUID
  buyOfferId: text("buy_offer_id").notNull().references(() => buyOffers.id, { onDelete: "cascade" }),
  assetId: text("asset_id").notNull().references(() => globalAssets.id, { onDelete: "cascade" }),
  offerPrice: numeric("offer_price", { precision: 10, scale: 2 }), // Amount offered for this asset
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(),
  sellerId: text("seller_id").references(() => sellers.id), // Direct reference to seller (nullable during migration)
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }), // Direct reference to show/event
  offerPercentage: numeric("offer_percentage", { precision: 5, scale: 2 }), // Percentage user entered (e.g., 75.50)
  marketValueAtOffer: numeric("market_value_at_offer", { precision: 10, scale: 2 }), // Market value when offer was made (null until sent)
  confidenceLevel: integer("confidence_level"), // User's confidence in the offer (1-5 scale)
  expectedProfit: numeric("expected_profit", { precision: 10, scale: 2 }), // Calculated expected profit
  sentAt: timestamp("sent_at"), // When the offer was actually sent (locks market value)
});

// Buy offer status options - simplified to active/closed (80/20 rule)
export const buyOfferStatusOptions = [
  "active",   // Session is open - any work in progress
  "closed"    // Session is done - completed or cancelled
] as const;

export type BuyOfferStatus = (typeof buyOfferStatusOptions)[number];

// Schema validators for buy mode
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  userId: true,
  archived: true, // Users don't set archived when creating - defaults to false
  createdAt: true,
  updatedAt: true,
}).extend({
  // Email validation: optional but must be valid email format if provided
  email: z.string()
    .optional()
    .transform(val => val?.trim() || null)
    .refine(
      val => val === null || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: "Invalid email address" }
    ),
});

export const updateContactSchema = createInsertSchema(contacts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Email validation: optional but must be valid email format if provided
  email: z.string()
    .optional()
    .transform(val => val?.trim() || null)
    .refine(
      val => val === null || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: "Invalid email address" }
    ),
}).partial();

export const insertSellerSchema = createInsertSchema(sellers).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuyerSchema = createInsertSchema(buyers).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBuyOfferSchema = createInsertSchema(buyOffers).omit({
  id: true,
  offerNumber: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateBuyOfferSchema = insertBuyOfferSchema.partial();

export const insertEvaluationAssetSchema = createInsertSchema(evaluationAssets).omit({
  id: true,
  addedAt: true,
});

export const updateEvaluationAssetSchema = insertEvaluationAssetSchema.partial();

export const insertBuyListCartSchema = createInsertSchema(buyListCart).omit({
  id: true,
  addedAt: true,
});

export const updateBuyListCartSchema = insertBuyListCartSchema.partial();

// Buy mode type definitions
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type UpdateContact = z.infer<typeof updateContactSchema>;

export type Seller = typeof sellers.$inferSelect;
export type InsertSeller = z.infer<typeof insertSellerSchema>;

export type Buyer = typeof buyers.$inferSelect;
export type InsertBuyer = z.infer<typeof insertBuyerSchema>;

export type BuyOffer = typeof buyOffers.$inferSelect;
export type InsertBuyOffer = z.infer<typeof insertBuyOfferSchema>;
export type UpdateBuyOffer = z.infer<typeof updateBuyOfferSchema>;

// Buy session aliases - new terminology for the same entities
export type BuySession = BuyOffer;
export type InsertBuySession = InsertBuyOffer;
export type UpdateBuySession = UpdateBuyOffer;

export type EvaluationAsset = typeof evaluationAssets.$inferSelect;
export type InsertEvaluationAsset = z.infer<typeof insertEvaluationAssetSchema>;
export type UpdateEvaluationAsset = z.infer<typeof updateEvaluationAssetSchema>;

export type BuyListCart = typeof buyListCart.$inferSelect;
export type InsertBuyListCart = z.infer<typeof insertBuyListCartSchema>;
export type UpdateBuyListCart = z.infer<typeof updateBuyListCartSchema>;

// Extended types for joins
export type SellerWithContact = Seller & { contact: Contact };
export type BuyOfferWithDetails = BuyOffer & { 
  seller: SellerWithContact;
  event?: Event;
};

export type BuySessionWithDetails = BuyOfferWithDetails;

// Consignments - Managing other people's cards for sale
export const consignments = pgTable("consignments", {
  id: text("id").primaryKey().notNull(), // UUID
  userId: text("user_id").notNull().references(() => users.id), // SlabFy user managing the consignment
  consignorId: text("consignor_id").references(() => consignors.id), // Reference to consignor relationship
  title: text("title").notNull(), // e.g., "John's Baseball Collection"
  description: text("description"),
  status: text("status").notNull().default("active"), // active, paused, completed, cancelled
  
  // Pricing strategy settings
  pricingMode: text("pricing_mode").default("market"), // 'fixed' or 'market'
  listPercentAboveMarket: integer("list_percent_above_market").default(20), // % above market for list price
  enableReserveStrategy: boolean("enable_reserve_strategy").default(true),
  reserveStrategy: text("reserve_strategy").default("match"), // 'match' or 'percentage'
  reservePercentOfMarket: integer("reserve_percent_of_market").default(100), // % of market for reserve
  listRounding: integer("list_rounding").default(5), // Round list prices to: 1, 5, or 10
  reserveRounding: integer("reserve_rounding").default(1), // Round reserve prices to: 1 or 5
  defaultSplitPercentage: numeric("default_split_percentage", { precision: 5, scale: 2 }).default("95.00"), // Default consignor split % for this consignment
  
  paymentTerms: text("payment_terms"), // Payment terms for this consignment
  notes: text("notes"),
  archived: boolean("archived").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consignment contact information (renamed from consignors to match database)
// Consignors table - references contacts table (following sellers/buyers pattern)
export const consignors = pgTable("consignors", {
  id: text("id").primaryKey().notNull(), // UUID
  contactId: text("contact_id").notNull().references(() => contacts.id),
  userId: text("user_id").notNull().references(() => users.id),
  isActive: boolean("is_active").default(true),
  paymentTerms: text("payment_terms"), // Specific payment terms for this consignor
  specialNotes: text("special_notes"), // Consignor-specific business notes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consignment assets - links global assets to consignments with pricing
export const consignmentAssets = pgTable("consignment_assets", {
  id: text("id").primaryKey().notNull(), // UUID
  consignmentId: text("consignment_id").notNull().references(() => consignments.id, { onDelete: "cascade" }),
  globalAssetId: text("global_asset_id").notNull().references(() => globalAssets.id, { onDelete: "cascade" }),
  consignorPrice: numeric("consignor_price", { precision: 10, scale: 2 }), // What we owe the consignor
  askingPrice: numeric("asking_price", { precision: 10, scale: 2 }), // Current asking price (List Price)
  reservePrice: numeric("reserve_price", { precision: 10, scale: 2 }), // Minimum acceptable price
  soldPrice: numeric("sold_price", { precision: 10, scale: 2 }), // Final sold price (when sold)
  splitPercentage: numeric("split_percentage", { precision: 5, scale: 2 }), // Consignor split % (house share = 100 - split)
  status: text("status").notNull().default("draft"), // draft, active, on_hold, sold, returned
  notes: text("notes"),
  addedAt: timestamp("added_at").defaultNow(), // When consignment record was created (fallback for days listed)
  listedAt: timestamp("listed_at"), // When item was actually published/made available for sale
  soldAt: timestamp("sold_at"), // When the asset was sold
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Consignment status options
export const consignmentStatusOptions = [
  "active",
  "paused", 
  "completed",
  "cancelled"
] as const;

// Consignment Asset Status - Production Ready
export const consignmentAssetStatusOptions = [
  "draft",     // Default when asset is added
  "active",    // Asset is live for sale
  "on_hold",   // Temporarily not for sale
  "sold",      // Asset has been sold
  "returned"   // Asset returned to consignor
] as const;

export type ConsignmentStatus = (typeof consignmentStatusOptions)[number];
export type ConsignmentAssetStatus = (typeof consignmentAssetStatusOptions)[number];

// Schema validators for consignments
export const insertConsignmentSchema = createInsertSchema(consignments).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().optional(), // Make title optional for auto-generation
});

export const updateConsignmentSchema = insertConsignmentSchema.partial();

// For API input - contact data that will be used to create consignor
export const insertConsignorContactSchema = createInsertSchema(contacts).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  // Email validation: optional but must be valid email format if provided
  email: z.string()
    .optional()
    .transform(val => val?.trim() || null)
    .refine(
      val => val === null || val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      { message: "Invalid email address" }
    ),
});

export const insertConsignorSchema = createInsertSchema(consignors).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateConsignorSchema = insertConsignorSchema.partial();

export const insertConsignmentAssetSchema = createInsertSchema(consignmentAssets).omit({
  id: true,
  addedAt: true,
  updatedAt: true,
});

export const updateConsignmentAssetSchema = insertConsignmentAssetSchema.partial();

// Consignment type definitions
export type Consignment = typeof consignments.$inferSelect;
export type InsertConsignment = z.infer<typeof insertConsignmentSchema>;
export type UpdateConsignment = z.infer<typeof updateConsignmentSchema>;

export type Consignor = typeof consignors.$inferSelect;
export type InsertConsignor = z.infer<typeof insertConsignorSchema>;
export type UpdateConsignor = z.infer<typeof updateConsignorSchema>;

export type ConsignmentAsset = typeof consignmentAssets.$inferSelect;
export type InsertConsignmentAsset = z.infer<typeof insertConsignmentAssetSchema>;
export type UpdateConsignmentAsset = z.infer<typeof updateConsignmentAssetSchema>;

// Extended types for joins
export type ConsignorWithContact = Consignor & {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  companyName?: string | null;
  contact: Contact;
};
export type ConsignmentWithConsignor = Consignment & { consignor: Consignor };
export type ConsignmentWithDetails = Consignment & {
  consignor?: (Consignor & { contact?: Contact | null }) | null;
  consignorName: string; // Flattened consignor contact name for easier frontend access
  totalAssets: number;
  totalValue: number; // Actual revenue from sold items
  pipelineValue: number; // Total pipeline value (sold + asking prices)
  potentialProfit: number;
};

// Collections - User-defined groupings of assets
export const collections = pgTable("collections", {
  id: text("id").primaryKey().notNull(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  // Optional thumbnail/cover image for the collection
  coverImageUrl: text("cover_image_url"),
  color: text("color").default("#3B82F6"), // Hex color for UI display
  isPublic: boolean("is_public").default(false),
  isFavorite: boolean("is_favorite").default(false),
  archived: boolean("archived").default(false),
  tags: jsonb("tags").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Collection Assets - Junction table linking collections to assets
export const collectionAssets = pgTable("collection_assets", {
  id: text("id").primaryKey().notNull(), // UUID
  collectionId: text("collection_id").notNull().references(() => collections.id, { onDelete: "cascade" }),
  globalAssetId: text("global_asset_id").notNull().references(() => globalAssets.id, { onDelete: "cascade" }),
  notes: text("notes"), // Collection-specific notes for this asset
  addedAt: timestamp("added_at").defaultNow(),
});

// Collection schemas
export const insertCollectionSchema = createInsertSchema(collections).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const updateCollectionSchema = insertCollectionSchema.partial();

export const insertCollectionAssetSchema = createInsertSchema(collectionAssets).omit({
  id: true,
  addedAt: true,
});

// Collection types
export type Collection = typeof collections.$inferSelect;
export type InsertCollection = z.infer<typeof insertCollectionSchema>;
export type UpdateCollection = z.infer<typeof updateCollectionSchema>;

export type CollectionAsset = typeof collectionAssets.$inferSelect;
export type InsertCollectionAsset = z.infer<typeof insertCollectionAssetSchema>;

// Extended types for collections with asset counts and values
export type CollectionWithDetails = Collection & {
  totalAssets: number;
  totalValue: number;
  personalAssets: number;
  consignmentAssets: number;
};

// Sales Transactions - Track all sales when items are sold
export const salesTransactions = pgTable("sales_transactions", {
  id: text("id").primaryKey().notNull(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }), // Preserve financial records when event deleted
  eventInventoryId: text("event_inventory_id").references(() => eventInventory.id, { onDelete: "cascade" }), // Nullable - for event sales
  userAssetId: text("user_asset_id").references(() => userAssets.id, { onDelete: "cascade" }), // Nullable - for buying desk purchases
  globalAssetId: text("global_asset_id").notNull().references(() => globalAssets.id, { onDelete: "cascade" }),
  
  // Transaction type for easier querying
  transactionType: text("transaction_type").notNull().default("event_sale"), // "event_sale" | "purchase"
  
  // Sale details
  salePrice: numeric("sale_price", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // "cash", "check", "digital", "trade"
  
  // Buyer information
  buyerId: text("buyer_id").references(() => buyers.id), // May be null for walk-in sales
  buyerName: text("buyer_name"), // Captured even for non-contact buyers
  buyerEmail: text("buyer_email"),
  buyerPhone: text("buyer_phone"),
  
  // Seller/source information
  sellerId: text("seller_id").references(() => sellers.id), // May be null for direct sales
  sourceType: text("source_type"), // "portfolio" | "consignment" | "collection"
  
  // Receipt and tracking
  receiptSent: boolean("receipt_sent").default(false),
  receiptChannel: text("receipt_channel"), // "email" | "sms" | "none"
  orderId: text("order_id"), // Generated order ID for the transaction
  
  // Financial tracking
  costBasis: numeric("cost_basis", { precision: 10, scale: 2 }), // Original cost if known
  marketPriceAtSale: numeric("market_price_at_sale", { precision: 10, scale: 2 }), // Market price when sold
  profit: numeric("profit", { precision: 10, scale: 2 }), // Calculated profit (salePrice - costBasis)
  
  // Metadata
  notes: text("notes"),
  saleDate: timestamp("sale_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Sales transaction schemas
export const insertSalesTransactionSchema = createInsertSchema(salesTransactions).omit({
  id: true,
  createdAt: true,
});

export const updateSalesTransactionSchema = insertSalesTransactionSchema.partial();

// Sales transaction types
export type SalesTransaction = typeof salesTransactions.$inferSelect;
export type InsertSalesTransaction = z.infer<typeof insertSalesTransactionSchema>;
export type UpdateSalesTransaction = z.infer<typeof updateSalesTransactionSchema>;

// Extended types for sales with asset and contact details
export type SalesTransactionWithDetails = SalesTransaction & {
  asset: {
    id: string;
    title: string;
    playerName?: string;
    setName?: string;
    year?: string;
    grade?: string;
    certNumber?: string;
  };
  buyer?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  seller?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  event: {
    id: string;
    name: string;
    location?: string;
  };
};

// Purchase Transactions - Track purchases when buying cards (buying desk)
export const purchaseTransactions = pgTable("purchase_transactions", {
  id: text("id").primaryKey().notNull(), // UUID
  userId: text("user_id").notNull().references(() => users.id), // The buyer (authenticated user)
  eventId: text("event_id").references(() => events.id, { onDelete: "set null" }), // Preserve financial records when event deleted
  buyOfferId: text("buy_offer_id").references(() => buyOffers.id), // Links to buying desk session
  globalAssetId: text("global_asset_id").notNull().references(() => globalAssets.id, { onDelete: "cascade" }),
  userAssetId: text("user_asset_id").references(() => userAssets.id, { onDelete: "cascade" }), // Created asset
  
  // Purchase details
  purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // "cash", "check", "digital", "trade"
  
  // Seller information (who we bought from)
  sellerName: text("seller_name"), // Who we bought from
  sellerContactId: text("seller_contact_id").references(() => contacts.id), // Optional seller contact
  
  // Market context
  marketPriceAtPurchase: numeric("market_price_at_purchase", { precision: 10, scale: 2 }), // Market price when purchased
  
  // Metadata
  notes: text("notes"),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase transaction schemas
export const insertPurchaseTransactionSchema = createInsertSchema(purchaseTransactions).omit({
  id: true,
  createdAt: true,
});

export const updatePurchaseTransactionSchema = insertPurchaseTransactionSchema.partial();

// Purchase transaction types
export type PurchaseTransaction = typeof purchaseTransactions.$inferSelect;
export type InsertPurchaseTransaction = z.infer<typeof insertPurchaseTransactionSchema>;
export type UpdatePurchaseTransaction = z.infer<typeof updatePurchaseTransactionSchema>;

// Export modular schema files for Show Storefront feature
// Keeps schema.ts manageable while adding new tables for storefront, buying desk, analytics
export * from "./schema/index";
