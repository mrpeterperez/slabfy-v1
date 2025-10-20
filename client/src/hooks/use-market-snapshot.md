# useMarketSnapshot Hook

A unified React Query hook for fetching market data snapshots, supporting both single and batch requests with optimistic UI patterns.

## Features

- **Unified API**: Single hook handles both individual and batch asset requests
- **Optimistic UI**: Shows placeholders immediately, polls until real data arrives
- **Intelligent Caching**: Uses normalized cache keys to prevent duplicate requests
- **Pending State Management**: Tracks newly added assets and clears pending when real data arrives
- **TypeScript Support**: Full TypeScript interfaces and type safety
- **Error Handling**: Graceful fallbacks with default values on API failures
- **Performance Optimized**: Batch requests for efficiency, structural sharing for re-renders

## Basic Usage

### Single Asset

```tsx
import { useSingleMarketSnapshot } from '@/hooks/use-market-snapshot';

function AssetCard({ assetId }: { assetId: string }) {
  const { snapshot, isLoading, isPending } = useSingleMarketSnapshot(assetId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h3>{snapshot?.assetId}</h3>
      <p>Price: ${snapshot?.averagePrice || 0}</p>
      <p>Confidence: {snapshot?.confidence}%</p>
      <p>Sales: {snapshot?.salesCount}</p>
      {isPending && <span>Updating...</span>}
    </div>
  );
}
```

### Multiple Assets (Batch)

```tsx
import { useBatchMarketSnapshot } from '@/hooks/use-market-snapshot';

function PortfolioTable({ assets }: { assets: Asset[] }) {
  const assetIds = assets.map(a => a.id);
  const { marketData, isLoading, hasPendingAssets } = useBatchMarketSnapshot(assetIds);

  return (
    <div>
      {hasPendingAssets && <div>Fetching latest prices...</div>}
      {assets.map(asset => {
        const snapshot = marketData[asset.id];
        return (
          <div key={asset.id}>
            <span>{asset.title}</span>
            <span>${snapshot?.averagePrice || 0}</span>
            <span>{snapshot?.liquidity}</span>
          </div>
        );
      })}
    </div>
  );
}
```

### Advanced Usage with Options

```tsx
import { useMarketSnapshot } from '@/hooks/use-market-snapshot';

function AdvancedChart({ assetIds }: { assetIds: string[] }) {
  const { 
    marketData, 
    snapshots, 
    isLoading, 
    getSnapshot, 
    refetch 
  } = useMarketSnapshot(assetIds, {
    includeHistory: true,
    historyPoints: 30,
    refetchInterval: 10000, // 10 seconds
    staleTime: 5000, // 5 seconds
  });

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      {snapshots.map(snapshot => (
        <div key={snapshot.assetId}>
          <h4>{snapshot.assetId}</h4>
          <p>Current: ${snapshot.averagePrice}</p>
          {snapshot.history && (
            <div>
              History: {snapshot.history.length} points
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## API Reference

### useMarketSnapshot(ids, options)

Main hook that accepts single ID or array of IDs.

**Parameters:**
- `ids`: `string | string[]` - Asset ID(s) to fetch
- `options`: `UseMarketSnapshotOptions` - Configuration options

**Returns:**
```typescript
{
  // Core data
  marketData: Record<string, MarketSnapshot>;
  snapshots: MarketSnapshot[];
  
  // Query state
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isSuccess: boolean;
  isFetching: boolean;
  
  // Pending state
  pending: Record<string, number>;
  hasPendingAssets: boolean;
  
  // Helper functions
  getSnapshot: (assetId: string) => MarketSnapshot | undefined;
  getAllSnapshots: () => MarketSnapshot[];
  isPending: (assetId: string) => boolean;
  
  // Query object and controls
  query: UseQueryResult;
  refetch: () => Promise<any>;
}
```

### useSingleMarketSnapshot(assetId, options)

Convenience hook for single asset requests.

**Returns:** Same as useMarketSnapshot plus:
```typescript
{
  snapshot: MarketSnapshot | undefined;
  isPending: boolean; // for this specific asset
}
```

### useBatchMarketSnapshot(assetIds, options)

Convenience hook for batch asset requests (same as useMarketSnapshot with array).

## Configuration Options

```typescript
interface UseMarketSnapshotOptions {
  enabled?: boolean;                // Enable/disable the query
  refetchInterval?: number | false; // Auto-refetch interval
  includeHistory?: boolean;         // Include price history
  historyPoints?: number;           // Number of history points
  staleTime?: number;               // How long data stays fresh
  refetchOnWindowFocus?: boolean;   // Refetch on window focus
  pendingTimeoutMs?: number;        // Timeout for pending state
  pollIntervalMs?: number;          // Polling interval for pending
}
```

### Default Values

```typescript
{
  enabled: true,
  refetchInterval: false,
  includeHistory: false,
  historyPoints: 30,
  staleTime: 15000, // 15 seconds
  refetchOnWindowFocus: true,
  pendingTimeoutMs: 15000, // 15 seconds
  pollIntervalMs: 4000, // 4 seconds
}
```

## Data Types

```typescript
interface MarketSnapshot {
  assetId: string;
  averagePrice: number;
  confidence: number;
  salesCount: number;
  liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  history?: MarketHistoryPoint[];
}

interface MarketHistoryPoint {
  timestamp: string;
  price: number;
  volume: number;
}
```

## Optimistic UI Pattern

The hook implements optimistic UI by:

1. **Immediate Placeholders**: New assets show default values instantly
2. **Pending Tracking**: Newly added assets are marked as "pending"
3. **Smart Polling**: Polls for real data while assets are pending
4. **Auto-Clear**: Clears pending state when real data arrives or timeout occurs

## Caching Strategy

- **Single requests**: Cache key `['/api/market', assetId, options]`
- **Batch requests**: Cache key `['/api/market', { ids: sortedIds }, options]`
- **Normalized**: Same asset in different queries shares cache
- **Fresh data**: 15-second stale time ensures recent data
- **Background updates**: Continues updating in background

## Performance Optimizations

1. **Batch API calls** for multiple assets
2. **Structural sharing** prevents unnecessary re-renders
3. **Stable cache keys** with sorted IDs
4. **Intelligent polling** only when needed
5. **Background refetching** keeps data current
6. **Query deduplication** via React Query

## Error Handling

- **Graceful fallbacks**: Returns default values on API errors
- **Retry logic**: Built-in retry through React Query
- **Network awareness**: Respects online/offline state
- **Logging**: Warns on errors for debugging

## Migration from useMarketPricing

```tsx
// Old way
const { marketData, pricingQuery, pending } = useMarketPricing(assets);

// New way
const assetIds = assets.map(a => a.id);
const { marketData, query: pricingQuery, pending } = useBatchMarketSnapshot(assetIds);
```

The new hook provides the same interface while being more flexible and performant.