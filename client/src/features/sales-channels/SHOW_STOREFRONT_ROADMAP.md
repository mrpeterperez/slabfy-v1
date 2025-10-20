# 🏪 Show Storefront - Comprehensive Implementation Plan

*Event-based public storefronts for card show dealers*

**Status:** Planning → Implementation  
**Feature Owner:** Sales Channels  
**Priority:** High  
**Timeline:** 4-6 weeks

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Implementation Phases](#implementation-phases)
5. [API Endpoints](#api-endpoints)
6. [Component Structure](#component-structure)
7. [User Flows](#user-flows)
8. [Success Metrics](#success-metrics)

---

## 🎯 Overview

### What Is Show Storefront?

Show Storefront allows card dealers to create **public-facing digital storefronts** for their inventory at card shows. Attendees can:

- Browse inventory on a **tablet kiosk** at the dealer's booth
- Scan a **QR code** to view on their phone
- Check **live pricing** for cards they want to sell (Buying Desk integration)
- Purchase items directly through the storefront

### Key Features

✅ **Global Settings** - Default branding/settings for all shows  
✅ **Event-Specific Overrides** - Customize per show  
✅ **Live Inventory Sync** - Auto-pulls from event "Available" status  
✅ **Buying Desk Integration** - Customers can get instant buy offers  
✅ **QR Code Generation** - Branded QR codes with logo overlay  
✅ **Analytics Tracking** - Views, scans, interactions, conversions  
✅ **Mobile-First Design** - Optimized for phone and tablet  
✅ **POS Checkout System** - Multi-payment, receipt generation, contact creation  
✅ **Cart & Hold System** - Configurable hold times, auto-sold or require confirmation  
✅ **Tablet Spin UX** - Customer view ↔ Dealer view with 180° rotation  

### URL Structure

```
slabfy.com/@username                           → Main storefront (future)
slabfy.com/@username/shows/the-trade-show      → Show-specific storefront
```

**URL Slug Configuration:**
- Auto-generated from event name ("First Row Sports Show" → `first-row-sports-show`)
- Customizable per event (dealer can override slug)
- URL validation: lowercase, hyphens only, no special characters
- Old URLs redirect to new when slug changes (prevents broken links)

**Username Requirements:**
- 3-20 characters
- Letters, numbers, underscores only
- Unique across platform
- Indexed for fast public lookups

---

## 🏗️ Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Global Storefront Settings                │
│  (Sales Channels > Show Storefront)                         │
│  - Branding (logo, colors, fonts)                           │
│  - Customer Actions (enable/disable features)                │
│  - Design (cover image, button styles)                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Inherited by all shows
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Event Storefront Settings (Optional)            │
│  (Event Details > Storefront Tab)                           │
│  - Override any global setting                              │
│  - Event-specific data (table #, special instructions)      │
│  - Publish status (is_live)                                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Merged at runtime
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  Public Storefront View                      │
│  slabfy.com/@username/shows/the-trade-show                  │
│  - Home Page (welcome, QR, CTAs)                            │
│  - Inventory (available items only)                         │
│  - Buying Desk (scan-to-sell with auto-deny rules)         │
│  - POS Checkout (cart, payment, receipt)                    │
│  - Contact Creation (auto-tagged with event)                │
└─────────────────────────────────────────────────────────────┘
```

### Settings Inheritance

```typescript
// Runtime config resolution
function getStorefrontConfig(userId: string, eventId?: string) {
  const global = getGlobalSettings(userId);
  
  if (!eventId) return global;
  
  const eventOverrides = getEventSettings(eventId);
  
  return {
    ...global,
    ...eventOverrides.overrides, // Event settings win
    eventSpecific: {
      tableNumber: eventOverrides.tableNumber,
      specialInstructions: eventOverrides.specialInstructions,
    }
  };
}
```

---

## 💾 Database Schema

### New Tables

#### `storefront_settings`
Global storefront configuration (one per user)

```sql
CREATE TABLE storefront_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- General Settings
  store_logo TEXT, -- URL to uploaded logo
  store_name TEXT NOT NULL,
  description TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  welcome_message TEXT,
  
  -- Customer Actions (feature toggles)
  enable_inventory BOOLEAN DEFAULT true,
  enable_buying_desk BOOLEAN DEFAULT true,
  enable_price_checker BOOLEAN DEFAULT true,
  
  -- Design
  cover_image TEXT,
  font_style TEXT DEFAULT 'Slabfy Font',
  primary_color TEXT DEFAULT '#037C85',
  accent_color TEXT DEFAULT '#037C85',
  background_color TEXT DEFAULT '#ffffff',
  button_radius INTEGER DEFAULT 16,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

#### `event_storefront_settings`
Event-specific overrides (optional, one per event)

```sql
CREATE TABLE event_storefront_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Override flags (null = use global)
  override_store_logo BOOLEAN DEFAULT false,
  override_store_name BOOLEAN DEFAULT false,
  override_description BOOLEAN DEFAULT false,
  override_contact_phone BOOLEAN DEFAULT false,
  override_contact_email BOOLEAN DEFAULT false,
  override_welcome_message BOOLEAN DEFAULT false,
  override_cover_image BOOLEAN DEFAULT false,
  override_font_style BOOLEAN DEFAULT false,
  override_primary_color BOOLEAN DEFAULT false,
  override_accent_color BOOLEAN DEFAULT false,
  override_background_color BOOLEAN DEFAULT false,
  override_button_radius BOOLEAN DEFAULT false,
  
  -- Override values (same schema as storefront_settings)
  store_logo TEXT,
  store_name TEXT,
  description TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  welcome_message TEXT,
  cover_image TEXT,
  font_style TEXT,
  primary_color TEXT,
  accent_color TEXT,
  background_color TEXT,
  button_radius INTEGER,
  
  -- Event-specific fields (not in global)
  table_number TEXT, -- "Table #47 - Section B"
  special_instructions TEXT, -- "Ask about bulk deals!"
  
  -- Customer action overrides
  override_enable_inventory BOOLEAN DEFAULT false,
  override_enable_buying_desk BOOLEAN DEFAULT false,
  override_enable_price_checker BOOLEAN DEFAULT false,
  enable_inventory BOOLEAN,
  enable_buying_desk BOOLEAN,
  enable_price_checker BOOLEAN,
  
  -- Publish status
  is_live BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(event_id)
);
```

#### `storefront_analytics`
Track views, scans, interactions

```sql
CREATE TABLE storefront_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Event tracking
  event_type TEXT NOT NULL, -- 'page_view', 'qr_scan', 'inventory_view', 'buy_offer_created', 'checkout_started', 'checkout_completed', 'cart_abandoned'
  event_data JSONB, -- Flexible payload
  
  -- Session tracking
  session_id TEXT, -- Anonymous session identifier
  user_agent TEXT,
  ip_address TEXT,
  referrer TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  
  -- Conversion tracking
  asset_id UUID REFERENCES global_assets(id) ON DELETE SET NULL,
  cart_value NUMERIC(10, 2), -- Total cart value for checkout events
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_analytics_user_event (user_id, event_id, event_type),
  INDEX idx_analytics_created (created_at),
  INDEX idx_analytics_session (session_id)
);
```

#### `storefront_cart_holds`
Temporary cart holds with expiration

```sql
CREATE TABLE storefront_cart_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES global_assets(id) ON DELETE CASCADE,
  
  -- Session tracking (anonymous customer)
  session_id TEXT NOT NULL, -- Anonymous browser session
  
  -- Hold configuration
  hold_minutes INTEGER NOT NULL, -- Duration set by dealer (10, 40, etc.)
  expires_at TIMESTAMP NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'expired', 'completed', 'cancelled'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_cart_holds_event (event_id),
  INDEX idx_cart_holds_session (session_id),
  INDEX idx_cart_holds_expires (expires_at),
  UNIQUE(asset_id) -- One asset can only be held once at a time
);
```

#### `buying_desk_settings`
Global buying desk configuration

```sql
CREATE TABLE buying_desk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Pricing Strategy (similar to consignment model)
  default_offer_percentage NUMERIC(5, 2) DEFAULT 40.00, -- % of market value to offer (e.g., 40%)
  pricing_strategy TEXT DEFAULT 'below_market', -- 'below_market', 'match_market', 'custom'
  
  -- Auto-Deny Rules
  auto_deny_enabled BOOLEAN DEFAULT false,
  min_liquidity_level TEXT, -- 'fire', 'hot', 'warm' (auto-deny 'cool', 'cold')
  min_confidence_level INTEGER, -- 0-100, auto-deny below threshold
  require_review_all BOOLEAN DEFAULT false, -- Force manual review for all offers
  
  -- Counter Offer Settings
  allow_counter_offers BOOLEAN DEFAULT true,
  max_counter_rounds INTEGER DEFAULT 2, -- Limit negotiation rounds
  
  -- Notification Settings
  realtime_notifications BOOLEAN DEFAULT true,
  notification_email TEXT,
  notification_sms TEXT,
  
  -- Auto-Confirm Settings
  auto_confirm_sales BOOLEAN DEFAULT false, -- Auto-move to "Sold" vs require dealer confirmation
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

### Schema Updates

#### Update `contacts` table
Add source tracking and event association for storefront-generated contacts

```sql
-- Add new columns to existing contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'; 
-- 'manual', 'storefront_customer', 'event_customer', 'buying_desk'

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS source_event_id UUID REFERENCES events(id) ON DELETE SET NULL;
-- Associates contact with the event they were created at

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS mailing_address TEXT;
-- Optional shipping address (captured during checkout)

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'USA';

-- Index for filtering by source
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_source_event ON contacts(source_event_id);
```

#### Update `storefront_settings` table
Add POS and cart configuration

```sql
-- Add to existing storefront_settings table
ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS auto_confirm_sales BOOLEAN DEFAULT false;
-- Auto-move items to "Sold" vs require dealer confirmation

ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS default_hold_minutes INTEGER DEFAULT 10;
-- Default cart hold time (10, 40, etc.)

ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS enable_cart_holds BOOLEAN DEFAULT true;
-- Allow customers to request item holds

ALTER TABLE storefront_settings ADD COLUMN IF NOT EXISTS qr_code_logo_overlay BOOLEAN DEFAULT true;
-- Show dealer logo in center of QR code
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation & Database (Week 1)

**Goal:** Set up database schema, API routes, and basic CRUD operations

**Tasks:**
- [x] Create separate database migrations for each table:
  - [x] `storefront_settings` ✅ 
  - [x] `event_storefront_settings` ✅ 
  - [x] `storefront_analytics` ✅ 
  - [x] `storefront_cart_holds` ✅ 
  - [x] `buying_desk_settings` ✅ 
  - [x] `counter_offers` ✅ 
  - [x] Update `contacts` table (source, event association, address) ✅ 
- [x] Create Supabase Storage bucket: `storefront-images` (public) ✅ 
- [x] Add Drizzle schema definitions in `shared/schema/` (modular organization) ✅ 
- [x] Create storage methods in `server/storage.ts` ✅ 
- [x] Build API routes (`/api/storefront/*`) ✅ 
- [x] Add TypeScript types and Zod schemas ✅ 
- [ ] Implement username validation middleware
- [ ] Manual testing with curl/Postman

**Deliverables:**
- ✅ All database tables created via separate migrations
- ✅ Supabase Storage bucket configured
- ✅ Working API for CRUD on storefront settings
- ✅ Storage methods with proper error handling
- ⏳ Manual API tests pending

**Completed (Jan 2025):**
- ✅ Created 8 Supabase migrations via MCP (all tables, RLS policies, storage bucket)
- ✅ Built modular Drizzle schemas in `shared/schema/` directory (storefront.ts, buying-desk.ts, analytics.ts)
- ✅ Updated contacts table with new fields (source, source_event_id, mailing_address, city, state, zip_code, country)
- ✅ Created 19 storage methods in DatabaseStorage class (getStorefrontSettings, createEventStorefrontSettings, etc.)
- ✅ Built `/api/storefront/*` routes with Swagger docs (GET/POST/PUT for settings)
- ✅ Registered storefront routes in `server/routes.ts`
- ✅ Zero TypeScript errors - all schemas and routes type-safe

**Testing Strategy:**
- Manual testing with curl/Postman (fast iteration)
- Verify data in Supabase dashboard
- No unit tests for MVP (add later when stable)

---

### Phase 2: Global Settings UI (Week 2)

**Goal:** Build settings interface in Sales Channels

**Tasks:**
- [ ] Create feature structure: `features/sales-channels/show-storefront/`
- [ ] Build settings tabs:
  - [ ] General Settings (logo, name, contact)
  - [ ] Customer Actions (feature toggles)
  - [ ] Design (colors, fonts, cover image)
  - [ ] Preview & Publish (QR code, copy link)
- [ ] Implement logo/cover image upload
- [ ] Create color picker component
- [ ] Add font style dropdown
- [ ] Build live preview component
- [ ] QR code generation (using `qrcode.react`)

**Component Tree:**
```
show-storefront/
  components/
    settings/
      general-settings-tab.tsx
      customer-actions-tab.tsx
      design-settings-tab.tsx
      preview-publish-tab.tsx
    shared/
      color-picker.tsx
      image-uploader.tsx
      font-selector.tsx
      qr-code-display.tsx
  hooks/
    use-storefront-settings.ts
    use-image-upload.ts
  api.ts
  types/
    settings-types.ts
  index.ts
```

**Deliverables:**
- ✅ Complete settings UI in Sales Channels
- ✅ Image upload working (logo + cover)
- ✅ QR code generation
- ✅ Settings persist to database

---

### Phase 3: Public Storefront Views (Week 3-4)

**Goal:** Build mobile-optimized public storefront with complete POS system

**Tasks:**
- [ ] Create public routes (no auth required)
- [ ] Build homepage component
  - [ ] Hero section with cover image
  - [ ] Welcome message
  - [ ] Branded QR code display (logo overlay, brand colors)
  - [ ] CTAs (View Inventory, Sell Your Cards, Price Checker)
- [ ] Build inventory page
  - [ ] Grid view of available assets
  - [ ] Search/filter functionality
  - [ ] Asset detail modal
  - [ ] Add to cart functionality
- [ ] Build cart & hold system
  - [ ] Shopping cart with multi-item support
  - [ ] Cart hold requests (configurable timeout)
  - [ ] Hold status display
  - [ ] Cart abandonment tracking
- [ ] Build POS checkout system
  - [ ] Reuse EventCheckoutDialog component pattern
  - [ ] Contact creation form (name, email, phone required)
  - [ ] Optional address fields (mailing, city, state, zip)
  - [ ] Multi-payment options (Cash, Credit, Zelle, Venmo, etc.)
  - [ ] Tablet spin UX (customer view → dealer confirms → spin back)
  - [ ] Receipt generation (email + SMS)
  - [ ] Auto-tag contacts as "Storefront Customer" with event association
  - [ ] Move purchased assets to "Sold" status (auto or require confirmation)
- [ ] Build buying desk flow (storefront-facing)
  - [ ] PSA scanner integration (reuse add-asset-modal-simple pattern)
  - [ ] Display buy offer with auto-deny logic
  - [ ] Show offer status (accepted, needs review, auto-denied)
  - [ ] Counter-offer interface (configurable max rounds)
  - [ ] Submit offer to dealer's dashboard
  - [ ] Real-time dealer notifications
- [ ] Apply design settings dynamically
  - [ ] CSS custom properties from DB
  - [ ] Font loading
  - [ ] Color theming (QR codes match brand)
- [ ] Mobile optimization
  - [ ] Touch-friendly UI
  - [ ] Responsive breakpoints
  - [ ] Tablet kiosk mode (larger touch targets)

**Component Tree:**
```
features/sales-channels/public-storefront/
  components/
    homepage/
      storefront-hero.tsx
      welcome-section.tsx
      branded-qr-code.tsx          # NEW: QR with logo overlay
      cta-buttons.tsx
    inventory/
      inventory-grid.tsx
      asset-card.tsx
      asset-detail-modal.tsx
      inventory-filters.tsx
      add-to-cart-button.tsx       # NEW
    cart/
      shopping-cart.tsx            # NEW
      cart-item.tsx                # NEW
      cart-hold-request.tsx        # NEW
      cart-summary.tsx             # NEW
    checkout/
      storefront-checkout.tsx      # NEW: Based on EventCheckoutDialog
      contact-form.tsx             # NEW: Name, email, phone, address
      payment-selector.tsx         # NEW: Cash, Credit, Zelle, etc.
      tablet-spin-confirm.tsx      # NEW: Spin tablet for dealer confirmation
      receipt-display.tsx          # NEW: Email + SMS receipt
    buying-desk/
      scan-interface.tsx           # Uses add-asset-modal-simple pattern
      offer-card.tsx
      auto-deny-display.tsx        # NEW: Show why offer was denied
      counter-offer-form.tsx       # NEW
      offer-success.tsx
  hooks/
    use-storefront-config.ts
    use-inventory.ts
    use-shopping-cart.ts           # NEW
    use-cart-holds.ts              # NEW
    use-buy-offer.ts
    use-checkout.ts                # NEW
    use-analytics.ts
  pages/
    StorefrontHome.tsx
    StorefrontInventory.tsx
    StorefrontBuyingDesk.tsx
    StorefrontCheckout.tsx         # NEW
  utils/
    apply-design-settings.ts
    slugify.ts
    share-utils.ts
    qr-code-generator.ts           # NEW: Branded QR codes
  api.ts
  index.ts
```

**Deliverables:**
- ✅ Working public storefront at `/@username/shows/:slug`
- ✅ Mobile-responsive design
- ✅ Live inventory display
- ✅ Complete POS checkout system
- ✅ Shopping cart with holds
- ✅ Buying desk integration with auto-deny
- ✅ Contact creation and tagging
- ✅ Receipt delivery (email + SMS)

---

### Phase 4: Event Integration & Overrides (Week 5)

**Goal:** Connect storefront to event details

**Tasks:**
- [ ] Add "Storefront" tab to Event Details
- [ ] Build override UI
  - [ ] Toggle "Use Global Settings" vs "Customize"
  - [ ] Show diff between global/custom
  - [ ] Same settings tabs as global
- [ ] Add "View Storefront" button to event detail header
- [ ] Implement publish/unpublish flow
- [ ] Add storefront link to event actions menu
- [ ] Test settings inheritance logic

**Integration Points:**
```typescript
// In Event Detail Page
<Tabs>
  <TabsList>
    <TabsTrigger value="inventory">Inventory</TabsTrigger>
    <TabsTrigger value="sold">Sold</TabsTrigger>
    <TabsTrigger value="buying-desk">Buying Desk</TabsTrigger>
    <TabsTrigger value="storefront">Storefront</TabsTrigger> // NEW
  </TabsList>
  
  <TabsContent value="storefront">
    <StorefrontSettings eventId={eventId} />
  </TabsContent>
</Tabs>
```

**Deliverables:**
- ✅ Storefront tab in event details
- ✅ Override system working
- ✅ Visual indicators for overridden settings
- ✅ Easy publish/unpublish toggle

---

### Phase 5: Analytics & Polish (Week 6)

**Goal:** Add tracking, optimize performance, polish UX

**Tasks:**
- [ ] Implement analytics tracking
  - [ ] Page views
  - [ ] QR scans (track via query param)
  - [ ] Inventory interactions
  - [ ] Buy offers created
- [ ] Build analytics dashboard
  - [ ] Show stats per event
  - [ ] Charts (views over time)
  - [ ] Top viewed assets
- [ ] Performance optimization
  - [ ] Image lazy loading
  - [ ] Asset query pagination
  - [ ] Cache static settings
- [ ] SEO optimization
  - [ ] Meta tags per storefront
  - [ ] Open Graph images
  - [ ] Sitemap generation
- [ ] Testing
  - [ ] E2E tests for public flows
  - [ ] Mobile device testing
  - [ ] QR code testing
- [ ] Documentation
  - [ ] User guide (help docs)
  - [ ] Video walkthrough
  - [ ] API documentation

**Deliverables:**
- ✅ Analytics tracking active
- ✅ Performance benchmarks met
- ✅ Complete documentation
- ✅ Production-ready feature

---

## 🔌 API Endpoints

### Storefront Settings (Protected)

```typescript
// Global settings
GET    /api/storefront/settings                // Get user's global settings
POST   /api/storefront/settings                // Create global settings
PUT    /api/storefront/settings                // Update global settings

// Event overrides
GET    /api/storefront/events/:eventId         // Get event storefront settings
POST   /api/storefront/events/:eventId         // Create event settings
PUT    /api/storefront/events/:eventId         // Update event settings
DELETE /api/storefront/events/:eventId         // Delete overrides (use global)

// Publishing
POST   /api/storefront/events/:eventId/publish   // Publish storefront
POST   /api/storefront/events/:eventId/unpublish // Unpublish storefront

// Assets
POST   /api/storefront/settings/logo           // Upload logo
POST   /api/storefront/settings/cover          // Upload cover image
```

### Public Storefront (No Auth)

```typescript
// Storefront data
GET    /api/public/@:username                         // Get user profile + default storefront
GET    /api/public/@:username/shows/:slug             // Get show-specific config

// Inventory
GET    /api/public/@:username/shows/:slug/inventory   // Get available assets

// Buying desk
POST   /api/public/@:username/shows/:slug/buy-offer   // Create buy offer from customer

// Analytics (fire-and-forget)
POST   /api/public/analytics/track                    // Track event
```

### Analytics (Protected)

```typescript
GET    /api/storefront/analytics                   // Get user's analytics
GET    /api/storefront/analytics/:eventId          // Get event-specific analytics
```

---

## 🧩 Component Structure

### Sales Channels - Show Storefront Settings

```
features/sales-channels/show-storefront/
  components/
    settings/
      settings-layout.tsx              // Main settings container
      general-settings-tab.tsx         // Logo, name, contact
      customer-actions-tab.tsx         // Feature toggles
      design-settings-tab.tsx          // Colors, fonts, cover
      preview-publish-tab.tsx          // Preview + QR code
    shared/
      color-picker.tsx                 // Reusable color input
      image-uploader.tsx               // Drag-drop image upload
      font-selector.tsx                // Font dropdown
      qr-code-display.tsx              // QR code generator + download
      settings-preview.tsx             // Live preview iframe
  hooks/
    use-storefront-settings.ts         // Global settings CRUD
    use-image-upload.ts                // Image upload logic
    use-settings-preview.ts            // Preview state management
  utils/
    settings-validation.ts             // Zod schemas
    image-processing.ts                // Resize, optimize images
  types/
    settings-types.ts                  // TypeScript interfaces
  api.ts                               // API client methods
  index.ts                             // Public exports
  README.md                            // Feature docs
```

### Public Storefront

```
features/sales-channels/public-storefront/
  components/
    layout/
      storefront-header.tsx            // Logo, nav, cart
      storefront-footer.tsx            // Powered by Slabfy
    homepage/
      storefront-hero.tsx              // Cover image + welcome
      welcome-section.tsx              // Event details, table #
      qr-code-section.tsx              // QR display + share
      cta-grid.tsx                     // Action buttons
    inventory/
      inventory-layout.tsx             // Grid/list container
      asset-card.tsx                   // Single asset display
      asset-detail-modal.tsx           // Expanded view
      inventory-filters.tsx            // Search, sort, filter
      empty-inventory.tsx              // No assets state
    buying-desk/
      scan-interface.tsx               // PSA scanner
      offer-card.tsx                   // Buy offer display
      offer-success.tsx                // Confirmation
  hooks/
    use-storefront-config.ts           // Fetch merged settings
    use-inventory.ts                   // Fetch available assets
    use-buy-offer.ts                   // Create buy offer
    use-analytics.ts                   // Track events
  pages/
    StorefrontHome.tsx                 // Home page route
    StorefrontInventory.tsx            // Inventory page route
    StorefrontBuyingDesk.tsx           // Buying desk route
  utils/
    apply-design-settings.ts           // Inject CSS vars
    slugify.ts                         // Generate URL slugs
    share-utils.ts                     // Copy link, QR download
  api.ts
  types/
    storefront-types.ts
  index.ts
  README.md
```

### Event Integration

```
features/events/
  components/
    event-detail/
      event-storefront-tab.tsx         // NEW: Storefront settings tab
      storefront-override-toggle.tsx   // Use global vs custom
      storefront-settings-wrapper.tsx  // Reuse global components
```

---

## 👤 User Flows

### Flow 1: Dealer Sets Up Global Storefront

1. Navigate to **Sales Channels > Show Storefront**
2. Fill out **General Settings**:
   - Upload logo
   - Enter store name
   - Add description
   - Enter contact info
3. Configure **Customer Actions**:
   - Toggle inventory display
   - Toggle buying desk
   - Toggle price checker
4. Customize **Design**:
   - Upload cover image
   - Select font
   - Pick primary/accent colors
   - Adjust button radius
5. View **Preview & Publish**:
   - See live preview
   - Copy default storefront link
   - Download QR code
6. Save settings

### Flow 2: Dealer Creates Show Storefront

1. Navigate to **Events > [Event Name]**
2. Click **Storefront** tab
3. Option A: Use global settings (default)
   - Click "Publish Storefront"
   - Copy shareable link
   - Download QR code
4. Option B: Customize for this show
   - Toggle "Customize This Show"
   - Override specific settings
   - Add table number
   - Add special instructions
   - Click "Publish Storefront"

### Flow 3: Customer Views Storefront on Phone

1. Scan QR code at dealer's booth
2. Land on storefront homepage
   - See dealer logo + cover image
   - Read welcome message
   - See event details + table number
3. Click "View My Inventory"
4. Browse available cards
   - Search/filter
   - View asset details
   - See pricing
5. (Future) Add to cart → checkout

### Flow 4: Customer Sells Card via Storefront

1. From storefront homepage, click "Sell Your Cards"
2. Scan PSA certificate (or enter cert number)
3. View buy offer:
   - Estimated price
   - Condition requirements
   - Dealer contact info
4. Click "Accept Offer"
5. Offer appears in dealer's Buying Desk
6. Show confirmation to customer

### Flow 5: Dealer Views Analytics

1. Navigate to **Sales Channels > Show Storefront**
2. Click **Analytics** (new tab)
3. View metrics:
   - Total storefront views
   - QR scans
   - Top performing shows
   - Buy offers generated
4. Filter by date range or specific event
5. Export data (CSV)

---

## 📊 Success Metrics

### Phase 1-2 (Foundation)
- [ ] 100% API test coverage
- [ ] Settings save/load < 500ms
- [ ] Image upload < 5s for 10MB files

### Phase 3-4 (Public Storefront)
- [ ] Storefront page load < 2s
- [ ] Mobile Lighthouse score > 90
- [ ] Zero console errors on public pages

### Phase 5 (Polish)
- [ ] 10+ dealers using feature in beta
- [ ] 100+ QR scans tracked
- [ ] 50+ buy offers generated via storefront

### Long-term KPIs
- % of events with published storefronts
- Avg storefront views per event
- Buy offer conversion rate (viewed → submitted)
- Customer satisfaction score

---

## 🔧 Technical Considerations

### Performance

- **Image Optimization**: Resize/compress uploads to max 1600x300
- **Lazy Loading**: Images below fold load on scroll
- **Asset Pagination**: Max 50 assets per request
- **CDN**: Serve static assets from CDN in production
- **Caching**: Cache storefront config for 5 minutes

### Security

- **Public Routes**: No auth required, but rate-limited
- **Settings Routes**: Require valid JWT token
- **Image Uploads**: Validate file type/size server-side
- **Analytics**: Anonymize IP addresses
- **CORS**: Allow public API access from any origin

### Accessibility

- **Keyboard Navigation**: All interactive elements
- **Screen Readers**: Proper ARIA labels
- **Color Contrast**: WCAG AA compliance
- **Touch Targets**: Min 44x44px on mobile

### SEO

- **Meta Tags**: Dynamic per storefront
- **Open Graph**: Custom preview images
- **Sitemap**: Auto-generate for public routes
- **Robots.txt**: Allow crawling of storefronts

---

## 🧪 Testing Strategy

### Unit Tests
- Settings validation (Zod schemas)
- Image processing utilities
- Settings inheritance logic
- Analytics tracking functions

### Integration Tests
- API endpoints (CRUD operations)
- Settings save → retrieve flow
- Image upload → storage flow
- Analytics event → database flow

### E2E Tests
- Complete dealer setup flow
- Public storefront navigation
- Buying desk flow (scan → offer)
- Mobile responsive behavior

### Manual Testing
- QR code scanning on real devices
- Tablet kiosk mode
- Various screen sizes
- Cross-browser compatibility

---

## 📚 Dependencies

### NPM Packages (New)
```json
{
  "qrcode.react": "^3.1.0",      // QR code generation
  "react-color": "^2.19.3",       // Color picker (or custom)
  "react-dropzone": "^14.2.3"     // File upload
}
```

### Existing Dependencies
- React Query (data fetching)
- Wouter (routing)
- Zod (validation)
- ShadCN components
- Tailwind CSS

---

## 🚧 Future Enhancements

### Phase 6+ (Post-MVP)
- [ ] **Custom Domains**: `mycardshop.com` → storefront
- [ ] **Checkout Flow**: Complete purchase on storefront
- [ ] **Inventory Management**: Dealer can mark sold via kiosk
- [ ] **Multi-Language**: Spanish, French support
- [ ] **Advanced Analytics**: Heatmaps, session recordings
- [ ] **A/B Testing**: Test different cover images/CTAs
- [ ] **Email Notifications**: Alert dealer on buy offers
- [ ] **SMS Integration**: Text updates to customers

---

## 📝 Notes & Open Questions

### Design Decisions
- **URL Slugs**: Auto-generate from event name or manual?
- **QR Code Style**: Black/white or match brand colors?
- **Preview Mode**: Iframe or new tab?

### Technical Debt
- Refactor existing event routing to support `/@username` pattern
- Standardize image upload across features
- Create shared analytics tracking service

### Dependencies
- Coordinate with Events feature team on inventory sync
- Align with Buying Desk feature on offer creation flow
- Sync with Design team on mobile component library

---

## ✅ Definition of Done

**Feature is complete when:**
- [ ] All 5 phases implemented and tested
- [ ] Documentation written (user guide + API docs)
- [ ] E2E tests passing
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Beta tested with 10+ dealers
- [ ] Analytics tracking verified
- [ ] Production deployment successful

---

**Last Updated:** October 5, 2025  
**Next Review:** October 12, 2025  
**Owner:** @peterperez
