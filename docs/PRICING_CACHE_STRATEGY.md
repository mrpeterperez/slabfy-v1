# 🔥 Pricing Cache Strategy - PREVENT API SPAM

## The Problem We're Solving

Every page refresh was hitting the Countdown API **10+ times** for the **same pricing data**. This causes:
- **Rate limit exhaustion** (Countdown API has limits)
- **Slow page loads** (waiting for redundant API calls)
- **Wasted bandwidth** (304 responses still make requests)
- **Poor UX** (loading spinners everywhere)

## Root Cause

Multiple React components on the same page were:
1. Using **different queryKeys** for the same pricing data
2. Setting **aggressive refetch settings** (refetchOnMount, refetchOnWindowFocus)
3. **Short staleTime** values (2-5 minutes)

This meant React Query couldn't share cached data between components.

---

## The Solution: Aggressive Caching ⚡

### When Does Pricing Data Change?

Pricing data **ONLY** changes in **2 scenarios**:

1. **Asset Creation** → Automatic background fetch (one-time, server-side)
2. **Manual Refresh** → User explicitly clicks refresh button

There's **NO** automatic scheduled refresh system. Once pricing is fetched, it's good until manually refreshed.

### Cache Configuration

**Global React Query Defaults** (`lib/queryClient.ts`):
```typescript
{
  staleTime: 30 * 60 * 1000,        // 30 minutes fresh
  gcTime: 24 * 60 * 60 * 1000,      // 24 hours in cache
  refetchOnWindowFocus: false,       // ❌ Don't spam on tab switch
  refetchOnReconnect: false,         // ❌ Don't spam on network reconnect
  refetchOnMount: false,             // ❌ Don't spam when component mounts
  refetchInterval: false,            // ❌ No automatic polling
}
```

**Standardized QueryKey**:
```typescript
// ✅ CORRECT - All components share this cache
queryKey: ['pricing', assetId]

// ❌ WRONG - Creates separate cache entries
queryKey: ['/api/pricing', assetId]
queryKey: [`/api/pricing/${assetId}`]
queryKey: ["pricing", assetId]  // String vs array literal
```

---

## How It Works

### First Load (Cache Miss)
```
User opens asset detail page
  → Component A requests pricing data
  → React Query: Cache miss, make API call
  → Response: { averagePrice: 150, liquidity: 'hot' }
  → Cache stored with key ['pricing', 'asset-123']
  → Component B requests same pricing data
  → React Query: Cache hit! Return cached data (no API call)
  → Component C requests same pricing data
  → React Query: Cache hit! Return cached data (no API call)
```

**Result**: 1 API call instead of 3+ ✅

### Page Refresh (Cache Hit)
```
User refreshes page (F5)
  → All components unmount/remount
  → Component A requests pricing data
  → React Query: Cache hit! Data still fresh (within 30min staleTime)
  → Return cached data immediately (no API call)
  → Component B: Cache hit (no API call)
  → Component C: Cache hit (no API call)
```

**Result**: 0 API calls ✅

### Manual Refresh
```
User clicks "Refresh Pricing" button
  → Call invalidateAfterManualRefresh(assetId)
  → React Query: Invalidate cache for ['pricing', assetId]
  → Next component request triggers fresh API call
  → New data cached
  → All components using that assetId get updated data
```

**Result**: 1 API call, all components update ✅

---

## Pricing Components Updated

All of these now use the standardized cache strategy:

**Asset Details Page:**
- ✅ `market-value-card.tsx`
- ✅ `price-card.tsx`
- ✅ `liquidity-card.tsx`
- ✅ `average-price-card.tsx`
- ✅ `sales-volume-card.tsx`
- ✅ `price-range-card.tsx`
- ✅ `asset-breakdown-table.tsx`
- ✅ `average-cost-card.tsx`
- ✅ `review-sale-card.tsx`

**Buying Desk:**
- ✅ `use-assets.ts` (useAssetPricing hook)

**Portfolio Table:**
- ✅ Uses batch pricing endpoint with proper caching

---

## Manual Refresh Implementation

When users explicitly refresh pricing:

```typescript
import { invalidateAfterManualRefresh } from '@/lib/cache-invalidation';

// In your refresh button handler:
await invalidateAfterManualRefresh(assetId);
```

This will:
1. Invalidate the cache for that specific asset
2. Trigger API call to get fresh data
3. Update all components using that pricing data

---

## Best Practices

### ✅ DO
- Use `['pricing', assetId]` queryKey everywhere
- Let global defaults handle cache behavior
- Only add custom settings for dynamic data (like buying-desk assets)
- Trust the cache - pricing doesn't change randomly

### ❌ DON'T
- Override global settings with aggressive refetch options
- Use different queryKey formats for the same data
- Set short staleTime values for pricing
- Enable refetchOnWindowFocus for pricing data

---

## Monitoring

Check the browser console for:
```
[pricing/single] processed=asset-123 durationMs=150
```

**Before fix**: You'd see 10+ of these for the same asset
**After fix**: You should see 1 (or 0 if cached)

---

## Exception: Buying Desk

Buying desk **assets** (not pricing) change frequently, so they have:
```typescript
staleTime: 1 * 60_000,  // 1 minute
refetchOnMount: true,   // Check for updates
```

But buying desk **pricing** still uses the global aggressive cache strategy.

---

## TL;DR

**Pricing API calls should happen:**
1. ✅ When asset is created (automatic, server-side)
2. ✅ When user clicks refresh button (manual, explicit)
3. ❌ ~~On every page refresh~~
4. ❌ ~~On every component mount~~
5. ❌ ~~On every tab switch~~

**Cache it hard, refresh it manually** 🔥
