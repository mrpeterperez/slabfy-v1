# 🔄 Cache Migration Guide

**Quick reference for migrating existing queries to the production cache system.**

---

## 📋 Before You Start

1. Read [`PRODUCTION_CACHE_SYSTEM.md`](./PRODUCTION_CACHE_SYSTEM.md) first
2. Have React Query DevTools open
3. Test each migration before moving to the next

---

## 🎯 Quick Migration Checklist

For each `useQuery` in your codebase:

- [ ] Import `queryKeys` from `@/lib/query-keys`
- [ ] Import appropriate cache tier from `@/lib/cache-tiers`
- [ ] Replace query key with `queryKeys.domain.method(id)`
- [ ] Spread cache tier config: `...PRICING_CACHE`
- [ ] Add stale-while-revalidate: `placeholderData: (prev) => prev`
- [ ] Remove manual refetch settings (if any)
- [ ] Test in browser with DevTools

---

## 🔍 Find All Queries

```bash
# Find all useQuery calls
grep -r "useQuery" client/src --include="*.tsx" --include="*.ts"

# Find potential query keys
grep -r "queryKey:" client/src --include="*.tsx" --include="*.ts"
```

---

## 🛠️ Migration Patterns

### Pattern 1: Basic Query Migration

**Before:**
```typescript
const { data } = useQuery({
  queryKey: ['pricing', assetId],
  queryFn: () => fetch(`/api/pricing/${assetId}`).then(r => r.json()),
});
```

**After:**
```typescript
import { queryKeys } from '@/lib/query-keys';
import { PRICING_CACHE } from '@/lib/cache-tiers';

const { data } = useQuery({
  queryKey: queryKeys.pricing.single(assetId),
  queryFn: async () => {
    const response = await fetch(`/api/pricing/${assetId}`);
    if (!response.ok) throw new Error('Fetch failed');
    return response.json();
  },
  placeholderData: (previousData) => previousData,
  ...PRICING_CACHE,
});
```

### Pattern 2: Query with Manual Refetch

**Before:**
```typescript
const { data, refetch } = useQuery({
  queryKey: ['sales', assetId],
  queryFn: fetchSales,
  refetchOnMount: true,
  refetchOnWindowFocus: true,
  staleTime: 5 * 60 * 1000,
});

<Button onClick={() => refetch()}>Refresh</Button>
```

**After:**
```typescript
import { queryKeys } from '@/lib/query-keys';
import { TIER_2_SEMI_STATIC } from '@/lib/cache-tiers';

const { data, refetch } = useQuery({
  queryKey: queryKeys.sales.recent(assetId),
  queryFn: fetchSales,
  placeholderData: (previousData) => previousData,
  ...TIER_2_SEMI_STATIC, // Handles refetch settings
});

<Button onClick={() => refetch()}>Refresh</Button>
```

### Pattern 3: Collection/List Query

**Before:**
```typescript
const { data } = useQuery({
  queryKey: ['collections', userId],
  queryFn: () => fetch(`/api/collections?userId=${userId}`).then(r => r.json()),
});
```

**After:**
```typescript
import { queryKeys } from '@/lib/query-keys';
import { TIER_3_DYNAMIC } from '@/lib/cache-tiers';

const { data } = useQuery({
  queryKey: queryKeys.collections.byUser(userId),
  queryFn: async () => {
    const response = await fetch(`/api/collections?userId=${userId}`);
    if (!response.ok) throw new Error('Fetch failed');
    return response.json();
  },
  placeholderData: (previousData) => previousData,
  ...TIER_3_DYNAMIC,
});
```

### Pattern 4: Query with Cancellation

**Before:**
```typescript
const { data } = useQuery({
  queryKey: ['sales', 'slow-endpoint'],
  queryFn: () => fetch('/api/slow-sales').then(r => r.json()),
});
```

**After:**
```typescript
import { queryKeys } from '@/lib/query-keys';
import { TIER_2_SEMI_STATIC } from '@/lib/cache-tiers';
import { fetchWithTimeout } from '@/lib/query-cancellation';

const { data } = useQuery({
  queryKey: queryKeys.sales.all(),
  queryFn: async ({ signal }) => {
    return fetchWithTimeout<SalesData>(
      '/api/slow-sales',
      15000, // 15s timeout
      { signal }
    );
  },
  placeholderData: (previousData) => previousData,
  ...TIER_2_SEMI_STATIC,
});
```

---

## 🎨 Adding Query Keys to Factory

If you find a query that doesn't have a key in the factory:

```typescript
// client/src/lib/query-keys.ts

export const queryKeys = {
  // ... existing keys ...
  
  // Add your new domain
  yourDomain: {
    all: () => ['yourDomain'] as const,
    lists: () => ['yourDomain', 'list'] as const,
    list: (filters: string) => ['yourDomain', 'list', { filters }] as const,
    details: () => ['yourDomain', 'detail'] as const,
    detail: (id: string) => ['yourDomain', 'detail', id] as const,
  },
};
```

---

## 🏷️ Choosing the Right Cache Tier

| Data Type | Cache Tier | Example |
|-----------|------------|---------|
| Card details, images, static data | `TIER_1_STATIC` | PSA card data |
| Market prices, sales volumes | `PRICING_CACHE` or `TIER_2_SEMI_STATIC` | eBay pricing |
| User collections, sessions | `TIER_3_DYNAMIC` | User-owned data |
| Live auctions, chat | `TIER_4_REALTIME` | Active bidding |

**Ask yourself:**
- How often does this data change?
- What's the cost of showing stale data?
- How expensive is the API call?

---

## 🧪 Testing Migrations

### 1. Check DevTools
```
✅ Query should appear with correct key: ['pricing', 'detail', '123']
✅ Status should show: fresh → stale after configured time
✅ No duplicate queries for same key
```

### 2. Test User Flow
```
1. Load page → Should make API call
2. Navigate away and back → Should NOT make API call (cache hit)
3. Wait for staleTime → Navigate back → Should refetch in background
4. Check network tab → Verify reduced API calls
```

### 3. Test Edge Cases
```
- Component unmount during fetch → Should cancel
- Network error → Should retry with backoff
- Navigate quickly → Should not spam API
```

---

## ⚠️ Common Mistakes

### ❌ Don't: Manually set refetch settings

```typescript
// Wrong - Overrides cache tier
const { data } = useQuery({
  queryKey: queryKeys.pricing.single(id),
  ...PRICING_CACHE,
  refetchOnMount: true, // ❌ Negates the cache tier
});
```

### ✅ Do: Trust the cache tier

```typescript
// Correct - Let the tier handle it
const { data } = useQuery({
  queryKey: queryKeys.pricing.single(id),
  ...PRICING_CACHE, // ✅ Tier sets all refetch settings
});
```

### ❌ Don't: Use string literals for keys

```typescript
// Wrong - Hard to maintain
queryKey: ['pricing', assetId]
```

### ✅ Do: Use query key factory

```typescript
// Correct - Type-safe, consistent
queryKey: queryKeys.pricing.single(assetId)
```

### ❌ Don't: Forget error handling

```typescript
// Wrong - fetch doesn't throw on 4xx/5xx
queryFn: () => fetch('/api/data').then(r => r.json())
```

### ✅ Do: Check response.ok

```typescript
// Correct - Explicit error handling
queryFn: async () => {
  const response = await fetch('/api/data');
  if (!response.ok) throw new Error('Fetch failed');
  return response.json();
}
```

---

## 📊 Migration Priority

Migrate in this order for maximum impact:

1. **High Impact** (Do first)
   - Pricing queries (already done ✅)
   - Sales data queries
   - Collection queries

2. **Medium Impact**
   - User profile queries
   - Buying desk queries (already done ✅)
   - Watchlist queries

3. **Low Impact** (Do last)
   - One-time fetch queries
   - Static content queries
   - Admin-only queries

---

## 🆘 Need Help?

**Common Issues:**

1. **"Query is always refetching"**
   - Check if you're overriding cache tier settings
   - Verify staleTime is set correctly
   - Check DevTools query status

2. **"Data is stale after mutation"**
   - Use `queryClient.invalidateQueries()` after mutation
   - Or use optimistic updates from `@/lib/optimistic-updates`

3. **"TypeScript errors on query keys"**
   - Make sure you're using `as const` in query key factory
   - Check that filter objects are properly typed

---

## ✅ Migration Complete?

After migrating all queries, verify:

- [ ] React Query DevTools shows consistent query keys
- [ ] No duplicate API calls for same data
- [ ] Stale-while-revalidate working (data shows instantly)
- [ ] Network tab shows reduced API calls
- [ ] No console errors
- [ ] App feels faster to users

**Ship it!** 🚀
