# Consignments System Documentation 🎯

**Last Updated:** October 3, 2025  
**Status:** ✅ Production Ready

## Overview

Complete consignment management system for dealers to track inventory from consignors. Handles asset tracking, pricing strategies, bulk operations, and automated market-based pricing calculations.

---

## System Architecture

### Database Tables

**Primary Tables:**
- `consignments` - Consignment records with pricing strategy settings
- `consignment_assets` - Junction table linking assets to consignments
- `global_assets` - Actual card/collectible metadata
- `contacts` - Consignor contact information

**Key Relationships:**
- Consignment → Contact (consignor_id)
- Consignment → Multiple Assets (via consignment_assets)
- Asset → Market Data (via global_asset_id)

---

## API Endpoints

### Base Path: `/api/consignments`

#### 1. **Consignment CRUD**
Located in: `consignments.ts`

```typescript
GET    /api/consignments              // List all consignments
GET    /api/consignments/:id          // Get single consignment
POST   /api/consignments              // Create new consignment
PUT    /api/consignments/:id          // Update consignment
DELETE /api/consignments/:id          // Delete consignment
```

#### 2. **Asset Management**
Located in: `assets.ts`

```typescript
GET    /api/consignments/:id/assets          // List assets in consignment
POST   /api/consignments/:id/assets          // Add asset (with auto-pricing)
PUT    /api/consignments/:id/assets/:assetId // Update single asset
DELETE /api/consignments/:id/assets/:assetId // Remove asset
```

**POST Asset with Auto-Pricing:**
- Fetches market value via `calculateMarketSnapshot()`
- Applies consignment pricing strategy automatically
- Returns asset with calculated list/reserve/split

#### 3. **Bulk Operations**
Located in: `bulk.ts` and `pricing.ts`

```typescript
PUT    /api/consignments/:id/assets/bulk     // Bulk update pricing
DELETE /api/consignments/:id/assets/bulk     // Bulk delete assets
```

**Bulk Update Request:**
```json
{
  "assetIds": ["uuid1", "uuid2"],
  "listPrice": 100,      // Optional
  "reserve": 80,         // Optional
  "split": 95,           // Optional
  "status": "active"     // Optional
}
```

**Bulk Update Response:**
```json
{
  "success": true,
  "updated": 2,
  "total": 2,
  "errors": []           // Only present if errors occurred
}
```

#### 4. **Consignor Management**
Located in: `consignor.ts`

```typescript
GET    /api/consignments/:id/consignor       // Get consignor details
PUT    /api/consignments/:id/consignor       // Update consignor
```

#### 5. **Summaries & Stats**
Located in: `summaries.ts`

```typescript
GET    /api/consignments/:id/summary         // Consignment summary stats
```

#### 6. **Auto-Titling**
Located in: `titles.ts`

```typescript
GET    /api/consignments/next-title          // Generate next title (C-YYYY-####)
```

---

## Pricing Strategy System

### Consignment Settings (Database Columns)

```typescript
pricing_mode: 'market' | 'fixed'              // Default: 'market'
list_percent_above_market: number             // Default: 20 (0-200%)
enable_reserve_strategy: boolean              // Default: true
reserve_strategy: 'match' | 'percentage'      // Default: 'match'
reserve_percent_of_market: number             // Default: 100 (50-150%)
list_rounding: 1 | 5 | 10                     // Default: 5
reserve_rounding: 1 | 5                       // Default: 1
default_split_percentage: number              // Default: 95.00 (0-100%)
```

### Automatic Pricing Logic

When adding assets with `pricing_mode: 'market'`:

**1. List Price Calculation:**
```typescript
rawListPrice = marketValue * (1 + list_percent_above_market / 100)
finalListPrice = roundPrice(rawListPrice, list_rounding)
```

**2. Reserve Price Calculation:**
```typescript
if (enable_reserve_strategy && reserve_strategy === 'match') {
  finalReserve = roundPrice(marketValue, reserve_rounding)
}

if (enable_reserve_strategy && reserve_strategy === 'percentage') {
  rawReserve = marketValue * (reserve_percent_of_market / 100)
  finalReserve = roundPrice(rawReserve, reserve_rounding)
}
```

**3. Split Percentage:**
```typescript
splitPercentage = default_split_percentage  // Always applied
```

**Example:**
- Market Value: $47.23
- Settings: 20% above, match reserve, round to $5/$1, 95% split
- **Result:**
  - List Price: $55 ($47.23 × 1.20 = $56.68 → rounded to $55)
  - Reserve: $47 ($47.23 → rounded to $47)
  - Split: 95%

### Rounding Helper

```typescript
function roundPrice(price: number, rounding: number): number {
  return Math.round(price / rounding) * rounding;
}
```

---

## Frontend Integration

### React Query Hooks

**Located in:** `client/src/features/my-consignments/.../hooks/`

```typescript
useAssetsData()           // Fetch & process assets with market data
useAssetMutations()       // CRUD operations for assets
useBulkAssetMutations()   // Bulk update/delete operations
```

### Query Configuration (Infinite Loop Prevention)

**Critical Settings:**
```typescript
useQuery({
  queryKey: [`/api/consignments/${id}/assets`],
  refetchOnWindowFocus: false,    // ✅ Prevents spam on clicks
  refetchOnMount: false,          // ✅ Prevents spam on remounts
  staleTime: 60_000,              // ✅ 1 minute cache
})

useBatchMarketSnapshot(assetIds, {
  refetchOnWindowFocus: false,    // ✅ Prevents market data spam
  staleTime: 60_000,              // ✅ 1 minute cache
})
```

**Why This Matters:**
- Default React Query behavior refetches on EVERY window focus
- Combined with market data fetching = infinite loop
- Manual invalidation via mutations is sufficient

---

## Storage Layer

**File:** `server/storage.ts` (storage-mod registry pattern)

### Key Methods

```typescript
// Create consignment
async createConsignment(userId, data)

// Add asset with auto-pricing
async addAssetToConsignment(consignmentId, globalAssetId, askingPrice?, marketValue?)
  - Fetches consignment settings
  - Calculates list/reserve/split based on pricing mode
  - Returns created asset with all fields

// Update asset
async updateConsignmentAsset(consignmentId, assetId, updates)

// Bulk delete
async removeAssetsFromConsignment(consignmentId, assetIds)
```

---

## Common Workflows

### 1. Create Consignment with Settings
```bash
POST /api/consignments
{
  "title": "C-2025-0012",
  "consignorId": "uuid",
  "pricing_mode": "market",
  "list_percent_above_market": 25,
  "enable_reserve_strategy": true,
  "reserve_strategy": "match",
  "default_split_percentage": 95
}
```

### 2. Add Asset (Auto-Pricing Applied)
```bash
POST /api/consignments/:id/assets
{
  "globalAssetId": "asset-uuid"
}

# Backend fetches market value ($47.23)
# Applies consignment settings
# Returns asset with:
#   - askingPrice: $55
#   - reservePrice: $47
#   - splitPercentage: 95
#   - status: 'draft'
```

### 3. Bulk Update Pricing
```bash
PUT /api/consignments/:id/assets/bulk
{
  "assetIds": ["uuid1", "uuid2", "uuid3"],
  "listPrice": 100,
  "reserve": 80
}

# Response:
{
  "success": true,
  "updated": 3,
  "total": 3
}
```

### 4. Bulk Status Change
```bash
PUT /api/consignments/:id/assets/bulk
{
  "assetIds": ["uuid1", "uuid2"],
  "status": "active"
}

# Sets status='active' and listedAt=NOW() for both assets
```

---

## File Structure

```
server/routes/consignments/
├── index.ts              # Router registration
├── consignments.ts       # Main CRUD
├── assets.ts             # Asset management (single operations)
├── bulk.ts               # Bulk delete operations
├── pricing.ts            # Bulk pricing operations
├── consignor.ts          # Consignor management
├── summaries.ts          # Stats & summaries
├── titles.ts             # Auto-title generation
└── CONSIGNMENTS_SYSTEM.md  # This file
```

---

## Testing Checklist

- [x] Create consignment with market pricing mode
- [x] Add asset - verify auto-pricing calculates correctly
- [x] Edit list/reserve/split - verify single update works
- [x] Bulk update multiple assets - verify all update
- [x] Bulk delete assets - verify all removed
- [x] Change status to active - verify listedAt timestamp
- [x] Fixed pricing mode - verify manual prices preserved
- [x] Query refetch prevention - verify no infinite loops

---

## Troubleshooting

### Infinite Loop on Asset Add/Edit
**Cause:** React Query refetching on window focus  
**Fix:** Add `refetchOnWindowFocus: false` to useQuery configs

### Assets Not Getting Auto-Priced
**Cause:** Missing market value or wrong pricing_mode  
**Fix:** Verify pricing_mode='market' and market API returns data

### Bulk Update Failing
**Cause:** Validation errors in nested callback  
**Fix:** All validation moved before `withUserDb` scope

### Reserve Price Not Calculating
**Cause:** `enable_reserve_strategy` is false  
**Fix:** Check consignment settings, enable reserve strategy

---

## Future Enhancements

- [ ] Batch market value refresh
- [ ] Historical pricing reports
- [ ] Automated status transitions
- [ ] Email notifications on status changes
- [ ] Export consignment reports (PDF/CSV)

---

**Built with:** Express.js, TypeScript, Drizzle ORM, React Query, Supabase  
**Maintained by:** SlabFy Platform Team
