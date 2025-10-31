# ✅ Production-Quality Cache Implementation Checklist

## Current Status: 🟡 GOOD BUT NOT PRODUCTION-READY

We fixed the immediate API spam issue, but to be **100% production quality** we need more work.

---

## ✅ What We Did Right

### 1. Standardized Query Keys
- ✅ All pricing components use `['pricing', assetId]`
- ✅ Enables cache sharing across components
- ✅ Prevents duplicate API calls

### 2. Conservative Refetch Settings
- ✅ `refetchOnMount: false` (global)
- ✅ `refetchOnWindowFocus: false` (global)
- ✅ `refetchOnReconnect: false` (global)
- ✅ Prevents tab-switching API spam

### 3. Reasonable Cache Duration
- ✅ 10min staleTime (global default)
- ✅ 30min gcTime (global default)
- ✅ Pricing: 15min stale, 1hr cache

### 4. Documentation
- ✅ Created `PRICING_CACHE_STRATEGY.md`
- ✅ Added inline comments explaining strategy
- ✅ Documented when pricing updates

---

## 🚨 What's Missing for Production

### 1. ❌ **Tiered Cache Strategy** (CRITICAL)
**Problem**: One global cache config for all data types

**Solution**: Different tiers for different data volatility
```typescript
// ✅ GOOD - We created cache-tiers.ts
import { PRICING_CACHE, TIER_3_DYNAMIC, LIST_CACHE } from '@/lib/cache-tiers';

// Pricing (semi-static)
useQuery({ ...PRICING_CACHE });

// Buying desk (dynamic)
useQuery({ ...TIER_3_DYNAMIC });

// Collections list
useQuery({ ...LIST_CACHE });
```

**Status**: 
- ✅ Created `cache-tiers.ts` with tier definitions
- ❌ Not implemented across all queries yet
- ❌ Need to audit all ~50+ useQuery calls

---

### 2. ❌ **Query Key Standardization** (MEDIUM PRIORITY)

**Problem**: Inconsistent key formats across the app
```typescript
// Current mess:
['/api/user', userId]                    // ❌ URL in key
[`/api/pricing/${assetId}`]               // ❌ Template literal
['buying-desk', 'assets', sessionId]      // ✅ Good
```

**Solution**: Standardized key factory pattern
```typescript
// ✅ Best practice
export const queryKeys = {
  user: {
    all: ['users'] as const,
    detail: (id: string) => ['users', id] as const,
    assets: (id: string) => ['users', id, 'assets'] as const,
  },
  pricing: {
    single: (id: string) => ['pricing', id] as const,
    batch: (ids: string[]) => ['pricing', 'batch', ids.sort().join(',')] as const,
  },
  buyingDesk: {
    session: (id: string) => ['buying-desk', 'session', id] as const,
    assets: (id: string) => ['buying-desk', 'assets', id] as const,
  },
};

// Usage:
useQuery({ queryKey: queryKeys.pricing.single(assetId) });
```

**Status**: ❌ Not implemented

---

### 3. ❌ **Optimistic Updates** (HIGH VALUE)

**Problem**: Mutations don't update cache instantly

**Current**:
```typescript
// User clicks "Add to Collection"
await mutation.mutateAsync();
await queryClient.invalidateQueries(); // Refetch from server
// User waits for network round-trip 😴
```

**Best Practice**:
```typescript
useMutation({
  mutationFn: addToCollection,
  onMutate: async (newAsset) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['collection', id] });
    
    // Snapshot previous value
    const prev = queryClient.getQueryData(['collection', id]);
    
    // Optimistically update
    queryClient.setQueryData(['collection', id], (old) => ({
      ...old,
      assets: [...old.assets, newAsset]
    }));
    
    return { prev }; // Return snapshot
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['collection', id], context.prev);
  },
  onSettled: () => {
    // Refetch to ensure sync
    queryClient.invalidateQueries({ queryKey: ['collection', id] });
  }
});
```

**Status**: ❌ Not implemented

---

### 4. ❌ **Request Deduplication** (MEDIUM PRIORITY)

**Problem**: Multiple components requesting same data simultaneously

**Example**:
```typescript
// Portfolio page loads
Component A: GET /api/pricing/abc (pending...)
Component B: GET /api/pricing/abc (duplicate call!)
Component C: GET /api/pricing/abc (duplicate call!)
```

**Solution**: React Query already handles this IF query keys match
- ✅ We fixed this for pricing (standardized keys)
- ❌ Need to verify for other endpoints

**Status**: ✅ Mostly done for pricing

---

### 5. ❌ **Stale-While-Revalidate Pattern** (NICE TO HAVE)

**Problem**: Users see loading states even when cached data exists

**Current**:
```typescript
const { data, isLoading } = useQuery(...);

if (isLoading) return <Skeleton />; // Shows skeleton even with stale data
```

**Best Practice**:
```typescript
const { data, isLoading, isFetching } = useQuery({
  ...PRICING_CACHE,
  placeholderData: (previousData) => previousData, // Keep stale data
});

// Show stale data immediately, indicate background refresh
if (isLoading && !data) return <Skeleton />;
return (
  <div>
    {isFetching && <RefreshIndicator />} {/* Subtle indicator */}
    <PricingCard data={data} />
  </div>
);
```

**Status**: ❌ Not implemented

---

### 6. ❌ **Cache Persistence** (NICE TO HAVE)

**Current**: Cache is in-memory only (lost on page refresh)

**Best Practice**: Persist to IndexedDB/localStorage
```typescript
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'slabfy-cache',
});

persistQueryClient({
  queryClient,
  persister,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
});
```

**Status**: 
- ⚠️ We have this in `queryClient.ts` but using localforage
- ❌ Need to verify it's working correctly

---

### 7. ❌ **Error Retry Strategy** (MEDIUM PRIORITY)

**Current**: Basic retry with exponential backoff
```typescript
retry: 1,
retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
```

**Best Practice**: Smarter retry based on error type
```typescript
retry: (failureCount, error: any) => {
  // Don't retry 4xx errors (client errors)
  if (error.status >= 400 && error.status < 500) return false;
  
  // Retry 5xx errors up to 3 times
  if (error.status >= 500) return failureCount < 3;
  
  // Retry network errors up to 3 times
  if (!error.status) return failureCount < 3;
  
  return false;
},
retryDelay: (attemptIndex) => {
  // Exponential backoff with jitter
  const base = Math.min(1000 * 2 ** attemptIndex, 30000);
  const jitter = Math.random() * 1000;
  return base + jitter;
},
```

**Status**: ❌ Not implemented

---

### 8. ❌ **Query Cancellation** (NICE TO HAVE)

**Problem**: User navigates away, but API call still in flight

**Solution**: Abort controllers
```typescript
queryFn: async ({ signal }) => {
  const response = await fetch('/api/pricing', { signal });
  return response.json();
},
```

**Status**: ❌ Not implemented

---

### 9. ❌ **Cache Size Management** (LOW PRIORITY)

**Problem**: Unbounded cache growth

**Solution**: Automatic cleanup
```typescript
gcTime: 30 * 60 * 1000, // ✅ Already have this
maxQueries: 100, // ❌ Not set (optional)
```

**Status**: ⚠️ Partial (gcTime set, but no maxQueries limit)

---

### 10. ❌ **Monitoring & Observability** (PRODUCTION CRITICAL)

**Problem**: No visibility into cache hit rates, API call volume

**Solution**: React Query DevTools + Custom logging
```typescript
// Already have DevTools in dev
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// Add production monitoring
queryClient.setLogger({
  log: (message) => {
    if (import.meta.env.PROD) {
      // Send to analytics
      analytics.track('react-query-log', { message });
    }
  },
  error: (error) => {
    // Send errors to Sentry
    Sentry.captureException(error);
  },
  warn: console.warn,
});
```

**Status**: ❌ Not implemented

---

## 🎯 Priority Implementation Order

### Phase 1: Critical (Do This Week)
1. ✅ ~~Fix pricing API spam~~ DONE
2. ❌ Implement tiered cache across all queries
3. ❌ Standardize query keys with factory pattern
4. ❌ Add error retry strategy

### Phase 2: High Value (Do Next Sprint)
5. ❌ Implement optimistic updates for mutations
6. ❌ Add stale-while-revalidate pattern
7. ❌ Verify cache persistence is working

### Phase 3: Nice to Have (Future)
8. ❌ Query cancellation
9. ❌ Production monitoring
10. ❌ Cache size limits

---

## 🏆 Production-Quality Checklist

To be **100% production-ready**, we need:

- [x] No API spam on page refresh
- [x] Standardized pricing query keys
- [x] Conservative refetch settings
- [x] Documentation
- [ ] Tiered cache strategy implemented app-wide
- [ ] Query key factory pattern
- [ ] Optimistic updates
- [ ] Stale-while-revalidate UI
- [ ] Smart error retry
- [ ] Production monitoring

**Current Score: 4/10** ⚠️

**After Phase 1: 7/10** ✅

**After Phase 2: 9/10** 🔥

**After Phase 3: 10/10** 💯

---

## 📚 References

- [TanStack Query Best Practices](https://tanstack.com/query/latest/docs/react/guides/important-defaults)
- [Query Key Factory Pattern](https://tkdodo.eu/blog/effective-react-query-keys)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/react/guides/optimistic-updates)
- [Error Handling](https://tkdodo.eu/blog/react-query-error-handling)
