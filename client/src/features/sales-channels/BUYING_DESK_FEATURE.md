# 💰 Buying Desk Feature - Complete Documentation

*Instant cash offers for card sellers with intelligent automation*

**Status:** Active Feature (v0 → v1 Upgrade Planned)  
**Feature Owner:** Operations  
**Integration:** Storefront, Events, Portfolio  
**Last Updated:** October 5, 2025

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [User Flows](#user-flows)
3. [Auto-Deny Rules Engine](#auto-deny-rules-engine)
4. [Offer Workflow & Status](#offer-workflow--status)
5. [Counter-Offer System](#counter-offer-system)
6. [Database Schema](#database-schema)
7. [Component Architecture](#component-architecture)
8. [Integration Points](#integration-points)
9. [Settings & Configuration](#settings--configuration)

---

## 🎯 Overview

### What Is Buying Desk?

Buying Desk allows dealers to **generate instant buy offers** for cards that customers want to sell. The system:

- **Scans PSA slabs** (QR code, photo, manual entry)
- **Calculates market-based offers** using liquidity + confidence data
- **Auto-denies low-value cards** based on dealer rules
- **Enables counter-offers** for negotiation
- **Integrates with storefront** for public-facing sales
- **Tracks all offers** in dealer dashboard

### Key Features

✅ **Multi-Scan Interface** - Quick Scan (QR), Photo Scan (future), Manual Entry  
✅ **Auto-Deny Rules** - Liquidity, confidence, custom filters  
✅ **Smart Offer Calculation** - % of market value (like consignment model)  
✅ **Counter-Offer System** - Configurable max rounds  
✅ **Real-Time Notifications** - Dealer notified on new offers  
✅ **Batch Processing** - Review multiple offers at once  
✅ **Storefront Integration** - Public-facing "Sell Your Cards" flow  
✅ **Payment Tracking** - Cash, Zelle, check, etc. (via buy session checkout)

---

## 👥 User Flows

### Flow 1: Customer Scans Card (Storefront)

**Customer Journey:**
1. Customer at card show sees "Sell Your Cards" button on storefront
2. Clicks → lands on scan interface
3. Options:
   - **Quick Scan**: Scan QR code on PSA slab
   - **Photo Scan**: Take photo of slab (future)
   - **Enter Manually**: Type cert number
4. System fetches PSA data + market pricing
5. Auto-deny rules run:
   - **Pass**: Offer displayed instantly
   - **Auto-Deny**: "This card doesn't meet our current buying criteria" message
   - **Needs Review**: "Your offer is being reviewed by the dealer" message
6. If offer shown, customer can:
   - **Accept**: Offer added to dealer's buy session cart
   - **Counter**: Submit counter-offer (if enabled)
   - **Pass**: Declines offer

**Dealer Experience:**
1. Real-time notification: "New buy offer for Kobe Bryant #138"
2. Review in dashboard:
   - See card details, market value, confidence
   - See customer's accepted/counter offer
   - Options: **Accept**, **Counter**, **Pass**
3. If accepted, proceed to buy session checkout
4. Customer gets paid (cash/Zelle/etc.)
5. Card added to dealer's inventory

---

### Flow 2: Dealer Reviews Batch Offers (Dashboard)

**Dealer Journey:**
1. Navigate to **Buying Desk** (or Event > Buying Desk tab)
2. View list of offers with status:
   - **Needs Review**: Awaiting dealer decision
   - **Auto-Denied**: Filtered out by rules
   - **Accepted**: Customer accepted, ready for checkout
   - **Passed**: Dealer or customer declined
   - **Counter Pending**: Waiting for customer response
3. Batch actions:
   - Select multiple offers
   - Set buy price for each (with `# / out of` serial tracking)
   - Move to cart
4. Proceed to checkout:
   - Collect customer payment info
   - Generate receipt
   - Update inventory

---

### Flow 3: Counter-Offer Negotiation

**Round 1:**
- Dealer offers $95 for Kobe Bryant card
- Customer counters $110

**Round 2:**
- Dealer counters $100
- Customer accepts

**System Logic:**
- Max rounds: 2 (configurable)
- Each side gets notification
- Expires after 24 hours (configurable)
- Final offer must be accepted by both sides

---

## 🤖 Auto-Deny Rules Engine

### Rule Categories

#### 1. **Liquidity-Based Filtering**
```typescript
interface LiquidityRule {
  enabled: boolean;
  minLevel: 'fire' | 'hot' | 'warm'; // Auto-deny 'cool' and 'cold'
}

// Example: Only accept cards with "hot" or "fire" liquidity
// Auto-deny "cool" and "cold" to avoid slow-moving inventory
```

#### 2. **Confidence-Based Filtering**
```typescript
interface ConfidenceRule {
  enabled: boolean;
  minConfidence: number; // 0-100
  requireReview: boolean; // Force manual review for low confidence
}

// Example: Auto-deny cards with < 40% confidence
// Cards with 40-70% confidence require manual review
// Cards with > 70% confidence auto-approve offer
```

#### 3. **Review All Mode**
```typescript
interface ReviewAllRule {
  enabled: boolean; // Forces manual review for every offer
}

// Example: Dealer wants to personally review every offer
// No auto-approvals, everything goes to "Needs Review"
```

#### 4. **Future: LLM-Based Rules** (Coming Soon)
```typescript
interface LLMRule {
  enabled: boolean;
  prompt: string; // "Exclude all football cards, only buy basketball"
  model: 'gpt-4' | 'claude-3';
}

// Example: Natural language rules
// "Only buy PSA 10 graded rookie cards from 2020-2024"
```

### Rule Processing Flow

```typescript
async function evaluateBuyOffer(card: PSAData, settings: BuyingDeskSettings) {
  // Step 1: Fetch market data
  const marketData = await getMarketData(card.certNumber);
  
  // Step 2: Check review all mode
  if (settings.require_review_all) {
    return { status: 'needs_review', reason: 'Review all mode enabled' };
  }
  
  // Step 3: Check confidence threshold
  if (marketData.confidence < settings.min_confidence_level) {
    if (settings.auto_deny_enabled) {
      return { status: 'auto_denied', reason: 'Low confidence (below threshold)' };
    } else {
      return { status: 'needs_review', reason: 'Low confidence' };
    }
  }
  
  // Step 4: Check liquidity threshold
  const liquidityRank = ['cold', 'cool', 'warm', 'hot', 'fire'];
  const minRank = liquidityRank.indexOf(settings.min_liquidity_level || 'warm');
  const cardRank = liquidityRank.indexOf(marketData.liquidity);
  
  if (cardRank < minRank) {
    if (settings.auto_deny_enabled) {
      return { status: 'auto_denied', reason: `Liquidity too low (${marketData.liquidity})` };
    } else {
      return { status: 'needs_review', reason: 'Low liquidity' };
    }
  }
  
  // Step 5: Calculate offer
  const offerPrice = calculateOffer(marketData.marketValue, settings.default_offer_percentage);
  
  return { 
    status: 'approved', 
    offerPrice,
    marketValue: marketData.marketValue,
    confidence: marketData.confidence,
    liquidity: marketData.liquidity
  };
}
```

---

## 📊 Offer Workflow & Status

### Status States

| Status | Description | Next Actions |
|--------|-------------|-------------|
| `pending` | Just scanned, evaluating rules | Auto-process → approved/denied/review |
| `approved` | Auto-approved by rules, offer shown | Customer: accept/counter/pass |
| `auto_denied` | Failed auto-deny rules | Dealer can override manually |
| `needs_review` | Requires dealer decision | Dealer: approve/deny/adjust offer |
| `accepted` | Customer accepted offer | Dealer: checkout → payment |
| `counter_pending` | Counter-offer submitted | Other party: accept/counter/pass |
| `passed` | Declined by dealer or customer | End of flow |
| `completed` | Payment processed, card acquired | Add to inventory |

### State Transitions

```
     ┌────────┐
     │ Scan   │
     └───┬────┘
         │
         ▼
   ┌──────────┐      auto-deny      ┌──────────────┐
   │ pending  │──────rules───────────▶│ auto_denied  │
   └────┬─────┘                      └──────────────┘
        │
        │ rules pass
        ▼
   ┌──────────┐
   │ approved │───────customer────────▶ accepted
   └────┬─────┘      accepts
        │
        │ low confidence
        ▼
   ┌──────────────┐
   │ needs_review │───dealer──────────▶ approved
   └──────────────┘   approves
```

---

## 🔄 Counter-Offer System

### Configuration

```typescript
interface CounterOfferSettings {
  allow_counter_offers: boolean; // Enable/disable feature
  max_counter_rounds: number;    // Limit back-and-forth (recommended: 2)
  counter_expiry_hours: number;  // Auto-expire if no response (default: 24)
}
```

### Counter-Offer Flow

**Example: Dealer offers $95, Customer counters $110**

```typescript
interface CounterOffer {
  id: string;
  original_offer_id: string;
  round: number; // 1, 2, etc.
  offered_by: 'dealer' | 'customer';
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'expired';
  expires_at: Date;
  created_at: Date;
}

// Round 1
{
  round: 1,
  offered_by: 'customer',
  amount: 110,
  status: 'pending'
}

// Round 2
{
  round: 2,
  offered_by: 'dealer',
  amount: 100,
  status: 'accepted' // Customer accepted
}
```

### UI Display

**Dealer View:**
```tsx
<OfferCard>
  <OriginalOffer>Your Offer: $95</OriginalOffer>
  <CounterOffer>Customer Counter: $110</CounterOffer>
  <Actions>
    <Button onClick={acceptCounter}>Accept $110</Button>
    <Button onClick={submitCounter}>Counter Again</Button>
    <Button onClick={pass}>Pass</Button>
  </Actions>
</OfferCard>
```

**Customer View (Storefront):**
```tsx
<OfferDisplay>
  <DealerOffer>Dealer Offer: $95</DealerOffer>
  <CounterInput>
    <Input placeholder="Your counter offer" />
    <Button>Submit Counter</Button>
  </CounterInput>
  <Actions>
    <Button onClick={accept}>Accept $95</Button>
    <Button onClick={pass}>No Thanks</Button>
  </Actions>
</OfferDisplay>
```

---

## 💾 Database Schema

### `buying_desk_settings`
Global dealer configuration

```sql
CREATE TABLE buying_desk_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Pricing Strategy
  default_offer_percentage NUMERIC(5, 2) DEFAULT 40.00,
  pricing_strategy TEXT DEFAULT 'below_market',
  
  -- Auto-Deny Rules
  auto_deny_enabled BOOLEAN DEFAULT false,
  min_liquidity_level TEXT, -- 'fire', 'hot', 'warm'
  min_confidence_level INTEGER, -- 0-100
  require_review_all BOOLEAN DEFAULT false,
  
  -- Counter Offer Settings
  allow_counter_offers BOOLEAN DEFAULT true,
  max_counter_rounds INTEGER DEFAULT 2,
  counter_expiry_hours INTEGER DEFAULT 24,
  
  -- Notification Settings
  realtime_notifications BOOLEAN DEFAULT true,
  notification_email TEXT,
  notification_sms TEXT,
  
  -- Auto-Confirm Settings
  auto_confirm_sales BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

### `buy_offers` (existing - buy sessions)
Main buy session tracking

```sql
-- Already exists in schema
-- Key fields:
-- - id, user_id, seller_id (contact)
-- - status: 'active', 'closed'
-- - created_at, sent_at
```

### `buy_offer_evaluation_assets` (existing)
Scanned assets awaiting review

```sql
-- Already exists in schema
-- Assets in "evaluation" phase before moving to cart
```

### `buy_offer_assets` (existing - buy list cart)
Assets included in final offer

```sql
-- Already exists in schema
-- Assets dealer intends to buy
-- Tracks offer_price, offer_percentage
```

### `counter_offers` (NEW)
Counter-offer negotiation tracking

```sql
CREATE TABLE counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buy_offer_id UUID NOT NULL REFERENCES buy_offers(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES global_assets(id) ON DELETE CASCADE,
  
  -- Negotiation tracking
  round INTEGER NOT NULL, -- 1, 2, 3...
  offered_by TEXT NOT NULL, -- 'dealer' | 'customer'
  amount NUMERIC(10, 2) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'expired'
  expires_at TIMESTAMP,
  
  -- Response
  responded_at TIMESTAMP,
  response_by TEXT, -- 'dealer' | 'customer'
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_counter_offers_session (buy_offer_id),
  INDEX idx_counter_offers_status (status)
);
```

---

## 🧩 Component Architecture

### Existing Components (buying-desk-v0)

```
features/buying-desk-v0/
  components/
    dialogs/
      add-assets-dialog.tsx        # Scan interface (Quick Scan + Manual)
    buy-session/
      assets-list.tsx              # List of scanned assets
      offer-card.tsx               # Individual offer display
  hooks/
    use-buy-session.ts             # Session management
    use-session-assets.ts          # Asset CRUD
  lib/
    api.ts                         # API client
  pages/
    BuySessionsListPage.tsx        # All sessions
    BuySessionDetailPage.tsx       # Single session detail
```

### New Components Needed

```
features/buying-desk-v0/
  components/
    auto-deny/
      auto-deny-badge.tsx          # Show why card was denied
      auto-deny-override.tsx       # Dealer can manually approve
    counter-offers/
      counter-offer-card.tsx       # Display counter-offer
      counter-offer-form.tsx       # Submit counter
      counter-history.tsx          # Show negotiation timeline
    settings/
      buying-desk-settings.tsx     # Global settings UI
      auto-deny-rules.tsx          # Configure filters
      pricing-strategy.tsx         # Set offer % logic
  hooks/
    use-buying-desk-settings.ts    # Settings CRUD
    use-auto-deny-evaluation.ts    # Run rules
    use-counter-offers.ts          # Counter-offer logic
  utils/
    offer-calculator.ts            # Calculate buy offers
    auto-deny-engine.ts            # Rule evaluation logic
```

---

## 🔌 Integration Points

### Storefront Integration

**Public-facing buy flow:**
```typescript
// Storefront → Buying Desk flow
slabfy.com/@username/shows/the-trade-show/sell

// Component structure
<StorefrontBuyingDesk eventId={eventId} dealerId={userId}>
  <ScanInterface /> {/* Reuses add-assets-dialog */}
  <OfferDisplay />  {/* Shows calculated offer */}
  <CounterForm />   {/* If enabled */}
</StorefrontBuyingDesk>
```

**API endpoints:**
```typescript
POST /api/public/@:username/shows/:slug/buy-offer
// Create buy offer from storefront
// No auth required (public-facing)

GET /api/buying-desk/settings/:userId
// Get dealer's buying desk settings
// Used to check if counter-offers enabled

POST /api/buying-desk/counter-offers
// Submit counter-offer from storefront
```

### Event Integration

**Buying Desk tab in Event Details:**
```typescript
// Event Detail Page
<Tabs>
  <TabsTrigger value="buying-desk">Buying Desk</TabsTrigger>
</Tabs>

<TabsContent value="buying-desk">
  <BuySessionsList eventId={eventId} />
  {/* Show only buy sessions for this event */}
</TabsContent>
```

### Portfolio Integration

**Add acquired cards to inventory:**
```typescript
// After buy session checkout completes
async function completeBuySession(sessionId: string) {
  const session = await getBuySession(sessionId);
  const assets = await getBuyListAssets(sessionId);
  
  // For each asset, create user_asset record
  for (const asset of assets) {
    await createUserAsset({
      userId: session.user_id,
      globalAssetId: asset.global_asset_id,
      purchasePrice: asset.offer_price,
      purchaseDate: new Date(),
      buyOfferId: sessionId, // Link to buy session
      source: 'buying_desk'
    });
  }
  
  // Mark session as closed
  await updateBuySession(sessionId, { status: 'closed' });
}
```

---

## ⚙️ Settings & Configuration

### Dealer Settings UI

Located at: **Operations > Buying Desk > Settings**

**Scope:** Global settings only (applies to all events)  
**Future:** Event-specific overrides can be added in Phase 2+

**Tabs:**
1. **Pricing Strategy**
   - Offer percentage (% of market value)
   - Pricing model: Below Market / Match Market / Custom
   
2. **Auto-Deny Rules**
   - Enable/disable auto-deny
   - Min liquidity level (fire/hot/warm/cool/cold)
   - Min confidence threshold (0-100%)
   - "Review All" mode toggle
   
3. **Counter Offers**
   - Enable/disable counter-offers
   - Max rounds (1-5)
   - Expiry time (hours)
   
4. **Notifications**
   - Real-time notifications (on/off)
   - Email address
   - SMS number
   - Notification frequency

### Default Settings

```typescript
const DEFAULT_BUYING_DESK_SETTINGS = {
  default_offer_percentage: 40.00, // 40% of market value
  pricing_strategy: 'below_market',
  auto_deny_enabled: false, // Off by default
  min_liquidity_level: null,
  min_confidence_level: null,
  require_review_all: false,
  allow_counter_offers: true,
  max_counter_rounds: 2,
  counter_expiry_hours: 24,
  realtime_notifications: true,
  auto_confirm_sales: false
};
```

---

## 📈 Analytics & Tracking

### Metrics to Track

**Conversion Funnel:**
```
Scans → Offers Generated → Offers Accepted → Checkouts Completed
```

**Key Metrics:**
- Total offers generated
- Auto-deny rate (% of scans denied)
- Acceptance rate (% of offers accepted)
- Counter-offer success rate
- Average offer amount
- Average time to acceptance
- Top accepted card types

**Dashboard Display:**
```tsx
<BuyingDeskAnalytics>
  <Metric label="Total Offers" value="247" />
  <Metric label="Acceptance Rate" value="38%" />
  <Metric label="Auto-Deny Rate" value="22%" />
  <Metric label="Avg Offer" value="$85" />
  <Metric label="Total Spent" value="$8,450" />
</BuyingDeskAnalytics>
```

---

## 🚀 Future Enhancements

### Phase 2 Features
- [ ] Photo scan (AI-powered PSA slab recognition)
- [ ] Bulk buy offers (scan multiple cards at once)
- [ ] LLM-based auto-deny rules ("No football cards")
- [ ] Predictive offers (suggest cards dealer might want)
- [ ] Buy lists (dealer sets target cards with pre-approved offers)

### Phase 3 Features
- [ ] SMS notifications for counter-offers
- [ ] Email templates for offer acceptance
- [ ] Integration with payment processors (Square, Stripe)
- [ ] Buy session templates (save pricing strategies)
- [ ] Historical offer analytics (trends over time)

---

## 📝 Open Questions & Decisions

### Implementation Details

**Q: Serial Number Tracking (`# / out of`)**
- **A**: This comes from add-asset-modal-simple.tsx
- Used to track numbered parallels (e.g., card #23/99)
- Helps match search strings for market data
- Stored in serialNumber/serialMax fields

**Q: Payment Flow After Acceptance**
- **A**: Uses existing buy session checkout (same as event buy sessions)
- Supports: Cash, Check, Zelle, Venmo, etc.
- Generates receipt via EventCheckoutDialog pattern
- Creates contact if new customer

**Q: Real-Time Notifications**
- **A**: Use WebSockets or polling?
- Recommendation: React Query with 30s refetch for MVP
- WebSockets for Phase 2 (real-time)

**Q: Counter-Offer Expiry**
- **A**: Background job to expire offers after 24 hours?
- Or check on-demand when viewing?
- Recommendation: Check on-demand for MVP, cron job for Phase 2

---

**Last Updated:** October 5, 2025  
**Next Review:** October 12, 2025  
**Owner:** @peterperez
