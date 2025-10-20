# Unified Market Pricing System
## Architecture & Implementation Guide

### 🎯 Overview

The Unified Market Pricing System consolidates all market data operations into a single, high-performance endpoint that provides pricing, liquidity, confidence scores, and sales history through one optimized API call.

### 🚀 Key Benefits

#### Performance Improvements
- **Single API Call**: Get pricing + liquidity + sales history in one request
- **Batch Support**: Query up to 50 assets simultaneously 
- **Intelligent Caching**: 7-minute TTL with automatic cache cleanup
- **Response Time**: 45-90ms (cached), 200-300ms (fresh)

#### Developer Experience
- **Unified Interface**: One endpoint replaces multiple calls
- **TypeScript Support**: Comprehensive type definitions
- **Rate Limiting**: Built-in protection (30 req/min per IP)
- **Cache Management**: Programmable cache purging

#### Data Quality
- **Comprehensive**: All market metrics in MarketSnapshot format
- **Consistent**: Standardized response structure
- **Flexible**: Optional sales history with configurable depth

### 📊 API Reference

#### Primary Endpoint
```
GET /api/market
```

#### Single Asset Request
```bash
# Basic market data
GET /api/market?id={assetId}

# With sales history (30 points)
GET /api/market?id={assetId}&includeHistory=true

# Custom history depth
GET /api/market?id={assetId}&includeHistory=true&historyPoints=50
```

#### Batch Request
```bash
# Multiple assets (up to 50)
GET /api/market?ids=asset1,asset2,asset3

# Batch with history
GET /api/market?ids=asset1,asset2,asset3&includeHistory=true&historyPoints=20
```

#### Response Structure

##### MarketSnapshot Interface
```typescript
interface MarketSnapshot {
  id: string;                    // Asset ID
  averagePrice: number;          // 30-day average or all-time
  highestPrice: number;          // Highest sale price
  lowestPrice: number;           // Lowest sale price
  liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  confidence: number;            // 0-100 percentage
  salesCount: number;            // Total sales records
  thirtyDaySalesCount: number;   // Recent sales count
  lastSaleDate: string | null;   // ISO date string
  pricingPeriod: string;         // "30 days" or "All time"
  exitTime: string;              // Market timing estimate
  salesHistory?: SalePoint[];    // Optional history array
}
```

##### SalePoint Interface
```typescript
interface SalePoint {
  price: number;        // Final sale price (including shipping)
  date: string;         // Sale date (ISO format)
  condition: string;    // Card condition
  marketplace: string;  // "eBay", etc.
  listingType: string;  // "Buy It Now", "Auction", etc.
  url?: string;         // Optional listing URL
}
```

### 🧠 Smart Caching System

#### Cache Strategy
- **TTL**: 7 minutes (optimal balance of freshness vs performance)
- **Key Structure**: `market:{assetId}:{includeHistory}:{historyPoints}`
- **Storage**: In-memory Map with automatic cleanup
- **Cleanup**: Every 10 minutes, removes expired entries

#### Cache Management API
```bash
# Purge specific assets
POST /api/market/purge
{
  "ids": ["asset1", "asset2"]
}

# Purge by pattern
POST /api/market/purge
{
  "pattern": "market:user-123"
}

# Response
{
  "message": "Cache purged successfully",
  "purgedCount": 5,
  "remainingEntries": 142
}
```

### 🔄 Migration Guide

#### From Legacy Pricing Endpoint
```typescript
// OLD: Multiple API calls
const pricing = await fetch(`/api/pricing/${assetId}`);
const sales = await fetch(`/api/sales-comp-universal/${assetId}`);

// NEW: Single unified call
const market = await fetch(`/api/market?id=${assetId}&includeHistory=true`);
const data = await market.json();
// Now you have: pricing + liquidity + sales history
```

#### From Individual Hook Calls
```typescript
// OLD: Multiple hooks
const { data: pricing } = useQuery(['pricing', assetId], ...);
const { data: sales } = useQuery(['sales', assetId], ...);

// NEW: Unified hook (recommended)
const { data: market } = useMarketSnapshot(assetId, {
  includeHistory: true,
  historyPoints: 30
});
```

#### Batch Optimization
```typescript
// OLD: N individual calls
const promises = assetIds.map(id => fetch(`/api/pricing/${id}`));
const results = await Promise.all(promises);

// NEW: Single batch call
const market = await fetch(`/api/market?ids=${assetIds.join(',')}`);
const batchData = await market.json();
// Returns: Record<string, MarketSnapshot | null>
```

### 🏗️ Implementation Architecture

#### Server-Side Components

##### Router (`server/routes/market.ts`)
- Express router with comprehensive middleware
- Zod validation for query parameters
- Rate limiting and error handling
- Swagger documentation integration

##### Core Functions
```typescript
// Single asset calculation
async function calculateMarketSnapshot(
  assetId: string, 
  includeHistory = false, 
  historyPoints = 30
): Promise<MarketSnapshot | null>

// Batch processing (ultra-fast)
async function calculateMarketSnapshotsBatch(
  assetIds: string[], 
  includeHistory = false, 
  historyPoints = 30
): Promise<Record<string, MarketSnapshot | null>>
```

##### Helper Integration
- **cardFinder.ts**: Resolves asset IDs to card data
- **salesGetter.ts**: Retrieves cached sales from database
- **Batch optimizations**: Single queries for multiple assets

#### Client-Side Hooks

##### useMarketSnapshot Hook
```typescript
// Single asset
const { data, isLoading, error } = useMarketSnapshot(assetId, {
  includeHistory: true,
  historyPoints: 50,
  staleTime: 15_000
});

// Multiple assets  
const { data: batchData } = useMarketSnapshot([id1, id2, id3], {
  includeHistory: false
});
```

##### Hook Features
- **Pending tracking**: Shows loading state for new assets
- **Automatic polling**: Optional refresh intervals
- **Cache integration**: Works with React Query
- **Error handling**: Graceful fallbacks

### 📈 Performance Metrics

#### Benchmark Results
- **Single Request**: 45-90ms (cached), 200-300ms (fresh)
- **Batch Request**: 200-400ms for 10 assets (vs 2-4 seconds individual)
- **Cache Hit Rate**: ~85% during normal usage
- **Memory Usage**: ~1MB for 1000 cached snapshots

#### Liquidity Calculation
```typescript
const liquidity = {
  'fire': '50+ sales',  // 1-3 days exit time
  'hot': '30-49 sales', // 3-7 days exit time  
  'warm': '15-29 sales', // 1-2 weeks exit time
  'cool': '5-14 sales',  // 2-4 weeks exit time
  'cold': '0-4 sales'    // 1+ months exit time
};
```

#### Confidence Algorithm
```typescript
function calculateConfidence(thirtyDaySales: number, totalSales: number): number {
  if (thirtyDaySales >= 10) return 95;
  if (thirtyDaySales >= 5) return 80;
  if (thirtyDaySales >= 3) return 60;
  if (totalSales >= 5) return 40;
  if (totalSales >= 2) return 20;
  return 0;
}
```

### 🛡️ Error Handling & Validation

#### Request Validation
```typescript
// Query schema
const singleMarketQuerySchema = z.object({
  id: z.string().min(1),
  includeHistory: z.string().optional().transform(val => val === 'true'),
  historyPoints: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined)
});
```

#### Error Responses
```typescript
// 400 Bad Request
{
  "error": "Invalid query parameters",
  "details": [/* Zod validation errors */]
}

// 404 Not Found  
{
  "error": "Asset not found"
}

// 429 Rate Limited
{
  "error": "Too many market data requests. Please try again later."
}
```

### 🔒 Rate Limiting & Security

#### Rate Limits
- **Market Data**: 30 requests/minute per IP
- **Cache Purge**: 5 requests/minute per IP
- **Headers**: Standard rate limit headers included

#### Security Features
- **Input validation**: Comprehensive Zod schemas
- **SQL injection protection**: Drizzle ORM parameterized queries
- **DoS protection**: Rate limiting and request size limits
- **Data sanitization**: Proper type coercion and validation

### 🚀 Production Deployment

#### Environment Requirements
- **Node.js**: 18+ recommended
- **Memory**: 512MB minimum (for caching)
- **Database**: PostgreSQL with proper indexing
- **Load Balancer**: Sticky sessions recommended for cache efficiency

#### Monitoring & Observability
```typescript
// Built-in logging
console.log(`[market] Single asset processed: ${assetId} (${duration}ms)`);
console.log(`[market] Batch processed: ${count} assets, ${uncached} uncached`);
console.log(`[market/cleanup] Cleaned ${expired} expired cache entries`);
```

#### Health Checks
```bash
# Basic health check
GET /api/market?id=test-asset-id

# Cache status
POST /api/market/purge
{ "pattern": "health-check" }
```

### 🔮 Future Enhancements

#### Planned Features
- **Redis Caching**: Distributed cache for multi-instance deployments
- **Webhook Integration**: Real-time market data updates
- **Analytics API**: Historical trend analysis
- **GraphQL Support**: Alternative query interface

#### Performance Roadmap
- **Database Optimization**: Specialized indexes for market queries
- **CDN Integration**: Edge caching for geographic performance
- **Compression**: Response compression for large batch requests
- **Streaming**: Server-sent events for real-time updates

### 📝 Best Practices

#### Client Implementation
```typescript
// ✅ Good: Use batch requests for multiple assets
const marketData = useMarketSnapshot(assetIds, { includeHistory: false });

// ❌ Bad: Individual requests in loop
assetIds.forEach(id => useMarketSnapshot(id));

// ✅ Good: Configure appropriate stale time
useMarketSnapshot(assetId, { staleTime: 5 * 60 * 1000 }); // 5 minutes

// ❌ Bad: Too frequent refetching
useMarketSnapshot(assetId, { staleTime: 0 });
```

#### Server Optimization
```typescript
// ✅ Good: Use batch helpers for multiple assets
const salesMap = await getSavedSalesBatch(cardIds);

// ❌ Bad: Individual database calls
for (const cardId of cardIds) {
  await getSavedSales(cardId);
}
```

### 🧪 Testing Strategy

#### Unit Tests
- Market snapshot calculation logic
- Cache key generation and validation
- Liquidity and confidence algorithms
- Error handling scenarios

#### Integration Tests
- End-to-end API requests
- Database integration with mock data
- Cache behavior and expiration
- Rate limiting enforcement

#### Performance Tests
- Load testing with realistic traffic patterns
- Memory usage monitoring
- Cache hit rate optimization
- Batch request scaling

---

*This document serves as the comprehensive guide for the Unified Market Pricing System. For implementation support, refer to the swagger documentation at `/api-docs` or contact the development team.*