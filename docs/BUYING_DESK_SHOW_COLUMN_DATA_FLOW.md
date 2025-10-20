# Buying Desk Table - Show Column & Data Flow Review

**Date:** October 2, 2025  
**Status:** ✅ Production Ready

## Overview

Added Show column to buying desk sessions table and fixed critical data mapping issues where seller information was being incorrectly pulled from event data. Complete review of API endpoints and data flow ensures proper seller and event information display.

## Final Table Structure (7 Columns)

### Desktop Table:
1. **☑️ Checkbox** - Bulk selection
2. **Session & Seller** - Session number + clickable seller link (REQUIRED)
3. **Show** - Clickable card show name or em dash (—)
4. **Buy List** - $ amount + item count  
5. **Created** - Session creation date
6. **Status** - Active/Closed pill
7. **•••** - Actions menu

### Mobile Card:
- **Session number** + Status pill
- **Seller** (clickable link) - REQUIRED
- **Show** (clickable link) - if linked to event
- **Buy List** ($ + count)
- **Created date**
- **Actions menu**

## Critical Data Flow Fix 🚨

### The Problem:
Frontend was **incorrectly** using `event.name` as the contact/seller name:

```typescript
// ❌ WRONG - This was the bug
contact: s.event?.name ? { name: s.event.name } : { name: "Unknown Seller" }
```

This caused:
- Event names showing as seller names
- Actual seller data being ignored
- "Unknown Seller" when no event existed
- Contact links not working

### The Solution:
Now properly maps seller data from API response:

```typescript
// ✅ CORRECT - Fixed mapping
contact: s.seller ? { 
  id: s.seller.id,
  name: s.seller.name, 
  email: s.seller.email ?? null, 
  phone: s.seller.phone ?? null 
} : null,
event: s.event ? {
  id: s.event.id,
  name: s.event.name,
  location: s.event.location ?? null
} : null,
```

## API Data Flow (Complete Review)

### 1. Database Query (`queries.ts`)
```typescript
const rows = await db
  .select({
    // Session data
    id: buyOffers.id,
    offerNumber: buyOffers.offerNumber,
    eventId: buyOffers.eventId,
    status: buyOffers.status,
    createdAt: buyOffers.createdAt,
    
    // Event data (joined)
    eventName: events.name,
    eventLocation: events.location,
    
    // Seller data (double joined: buyOffers → sellers → contacts)
    sellerId: buyOffers.sellerId,
    sellerName: contacts.name,
    sellerEmail: contacts.email,
    sellerPhone: contacts.phone,
  })
  .from(buyOffers)
  .leftJoin(events, eq(buyOffers.eventId, events.id))
  .leftJoin(sellers, eq(buyOffers.sellerId, sellers.id))
  .leftJoin(contacts, eq(sellers.contactId, contacts.id))
```

**Key Joins:**
- `buyOffers` → `events` (LEFT JOIN for event data)
- `buyOffers` → `sellers` (LEFT JOIN for seller relationship)
- `sellers` → `contacts` (LEFT JOIN for contact details)

**Why Double Join for Seller?**
- `sellers` table is junction table (many-to-many)
- Links users + contacts for seller relationships
- Preserves contact data even if seller relationship changes

### 2. Service Layer (`service.ts` / `mappers.ts`)
Transforms raw rows into clean API response:

```typescript
export function mapSession(row: SessionRow, aggregates: SessionAggregates): SessionSummary {
  return {
    id: row.id,
    sessionNumber: row.offerNumber,
    status: row.status,
    createdAt: row.createdAt,
    
    // Event object (nullable)
    event: row.eventId ? {
      id: row.eventId,
      name: row.eventName ?? "Unknown Event",
      location: row.eventLocation,
    } : undefined,
    
    // Seller object (nullable)
    seller: row.sellerId ? {
      id: row.sellerId,
      name: row.sellerName ?? "—",
      email: row.sellerEmail ?? undefined,
      phone: row.sellerPhone ?? undefined,
    } : undefined,
    
    // Cart aggregates
    cartCount: cart.cartCount,
    totalValue: cart.totalValue,
    expectedProfit: cart.expectedProfit,
  };
}
```

### 3. API Endpoint Response
`GET /api/buying-desk/sessions`

**Response Format:**
```json
[
  {
    "id": "uuid",
    "sessionNumber": "BD-2025-0011",
    "status": "active",
    "createdAt": "2025-10-02T...",
    
    "event": {
      "id": "event-uuid",
      "name": "Dallas Card Show",
      "location": "Allen, TX"
    },
    
    "seller": {
      "id": "seller-uuid",
      "name": "John Smith",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    
    "cartCount": 5,
    "totalValue": 1250.50,
    "expectedProfit": 350.75
  }
]
```

### 4. Frontend Data Hooks (`use-offers.ts`)

**FIXED Mapping:**
```typescript
const mapped = (sessions as any[]).map((s) => ({
  buyOffer: { 
    id: s.id, 
    offerNumber: s.sessionNumber,
    status: s.status,
    createdAt: s.createdAt,
  },
  
  // ✅ Properly map seller from API
  contact: s.seller ? { 
    id: s.seller.id,
    name: s.seller.name, 
    email: s.seller.email ?? null, 
    phone: s.seller.phone ?? null 
  } : null,
  
  // ✅ Separate event mapping
  event: s.event ? {
    id: s.event.id,
    name: s.event.name,
    location: s.event.location ?? null
  } : null,
  
  cartSummary: { 
    count: Number(s.cartCount ?? 0), 
    totalValue: Number(s.totalValue ?? 0), 
    expectedProfit: Number(s.expectedProfit ?? 0) 
  },
}));
```

### 5. UI Components

**Desktop Table (`sessions-table.tsx`):**
```tsx
const session = item.session || item;
const contact = item.contact || item.seller;
const event = item.event;

// Seller column (ALWAYS present)
{contact ? (
  <button onClick={() => navigate(`/buying-desk/contacts/${contact.id}`)}>
    {contact.name}
  </button>
) : (
  <div>Unknown Seller</div>
)}

// Show column (nullable)
{event ? (
  <button onClick={() => navigate(`/events/${event.id}`)}>
    {event.name}
  </button>
) : (
  <span>—</span>
)}
```

**Mobile Card (`session-card.tsx`):**
```tsx
// Seller (ALWAYS present)
{contact ? (
  <button onClick={() => navigate(`/buying-desk/contacts/${contact.id}`)}>
    {contact.name}
  </button>
) : (
  <p>Unknown Seller</p>
)}

// Show (conditional)
{event && (
  <button onClick={() => navigate(`/events/${event.id}`)}>
    {event.name}
  </button>
)}
```

## Business Rules

### Seller (Contact) - REQUIRED ✅
- **Cannot create session without seller**
- Frontend enforces contact selection in create dialog
- Backend creates seller relationship automatically
- If contact exists: creates/finds seller record
- If no seller ID: looks up by `contactId`
- Always displays seller name (never "Unknown Seller" in production)

### Show (Event) - OPTIONAL ⚪
- Sessions can exist without card show link
- Dealer can add event during creation
- Can link session to event later via edit
- Display: Show name or em dash (—)
- Clickable link to event details page

## Show Column Features

### Desktop Display:
- **Column Position:** Between "Session & Seller" and "Buy List"
- **Visibility:** `hidden lg:table-cell` (desktop only)
- **With Event:** Clickable show name
- **Without Event:** Em dash (—) in muted color

### Mobile Display:
- **Position:** After Seller, before Buy List
- **Only Shows:** If event exists
- **Clickable:** Links to event details
- **Icon:** Calendar icon for visual distinction

### Navigation:
```tsx
onClick={(e) => {
  e.stopPropagation(); // Prevents row click
  window.location.href = `/events/${event.id}`;
}}
```

## Column Responsibilities

### 1. Session & Seller
- **Always has seller** - required field
- Top: Session number (e.g., "BD-2025-0011")
- Bottom: Clickable seller name
- Links to: `/buying-desk/contacts/{contactId}`

### 2. Show
- **Optional** - not all sessions linked to shows
- Shows event name if linked
- Shows em dash (—) if not linked
- Links to: `/events/{eventId}`
- Hidden on mobile/tablet (`lg:table-cell`)

### 3. Buy List
- Shows committed purchases only
- Top: Total $ value
- Bottom: Item count
- Excludes evaluating assets

### 4. Created
- Session creation date
- Uses formatDate helper
- Hidden on mobile (`sm:table-cell`)

### 5. Status
- Active or Closed
- Auto-archives on close
- Hidden on mobile (`sm:table-cell`)

## API Endpoints Review

### ✅ GET /api/buying-desk/sessions
**Query Params:**
- `archived` (boolean) - filter by archive status
- `eventId` (string) - filter by card show

**Response:** Array of SessionSummary objects

**Includes:**
- Session data
- Seller/contact data (via join)
- Event data (via join)
- Cart aggregates (count, value, profit)

**Used By:**
- Sessions list (active tab)
- Sessions list (archive tab)
- Event detail page (sessions at this show)

### ✅ GET /api/buying-desk/sessions/:id
**Response:** Single SessionSummary object

**Used By:**
- Session detail page
- After create/update operations

### ✅ POST /api/buying-desk/sessions
**Body:**
```typescript
{
  contactId: string;      // REQUIRED
  eventId?: string;       // OPTIONAL
  notes?: string;
}
```

**Auto-creates seller relationship** if needed

**Used By:**
- Create session dialog

### ✅ PATCH /api/buying-desk/sessions/:id
**Body:**
```typescript
{
  status?: "active" | "closed";
  sellerId?: string;
  eventId?: string;      // Can link/unlink shows
  notes?: string;
}
```

**Auto-archives** when status changes to "closed"

**Used By:**
- Settings section (status change)
- Session edit (link to show)

### ✅ DELETE /api/buying-desk/sessions/:id
**Used By:**
- Delete confirmation dialog

## Testing Checklist

- [x] Desktop table shows 7 columns
- [x] Seller name always displays (never "Unknown Seller" in production)
- [x] Seller link navigates to contact details
- [x] Show column shows event name when linked
- [x] Show column shows em dash (—) when not linked
- [x] Show link navigates to event details
- [x] Show column hidden on mobile/tablet
- [x] Mobile card shows seller + event (if exists)
- [x] Created date displays correctly
- [x] Buy list shows $ + count
- [x] Status pill shows active/closed
- [x] All hover states work
- [x] No TypeScript errors
- [x] API returns proper seller + event data

## Files Modified

1. `server/routes/buying-desk/sessions/queries.ts` - Reviewed join structure
2. `server/routes/buying-desk/sessions/mappers.ts` - Reviewed data transformation
3. `client/src/features/buying-desk-v0/hooks/use-offers.ts` - Fixed seller mapping
4. `client/src/features/buying-desk-v0/hooks/use-sessions-list.ts` - Added event passthrough
5. `client/src/features/buying-desk-v0/components/session/components/sessions-table.tsx` - Added Show column
6. `client/src/features/buying-desk-v0/components/session/components/session-card.tsx` - Added Show display
7. `client/src/features/buying-desk-v0/components/session/sessions-list.tsx` - Pass event prop

---

**Result:** Complete data flow from database → API → frontend with proper seller and show information! 🎯
