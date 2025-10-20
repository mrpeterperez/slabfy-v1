# PRD: Automatic Sales Data Fetching on Asset Creation

## Overview
Implement automatic background sales data fetching when new assets are created to eliminate the need for manual refresh and provide immediate pricing data to users.

## Problem Statement
Currently, when users create new assets:
- Asset is saved successfully but shows no pricing data
- Users must manually click refresh to get sales/pricing information
- This creates friction and delays in the user experience

## Solution
Add automatic background sales data fetching that triggers immediately after asset creation using the existing refresh pipeline.

## Technical Implementation

### Files Modified
- `server/routes.ts` (2 small additions)

### Changes Required

**1. Add Import and Helper Function (top of server/routes.ts):**
```javascript
import { refreshCardSales } from './routes/helpers/controllers/refreshController';

async function fetchSalesDataForAsset(assetId: string) {
  try {
    const mockReq = { body: { assetId } };
    const mockRes = { 
      json: () => {}, 
      status: () => ({ json: () => {} }) 
    };
    await refreshCardSales(mockReq as any, mockRes as any);
  } catch (error) {
    console.log(`Background sales fetch failed for asset ${assetId}:`, error.message);
  }
}
```

**2. Add Background Call (line ~1349 in asset creation endpoint):**
```javascript
const userAsset = await storage.createUserAsset(userAssetData);
console.log(`✅ User asset created: ${userAsset.id}`);

// Fire and forget - automatic sales data fetching
setImmediate(() => fetchSalesDataForAsset(userAsset.id));

// Create legacy asset object for response compatibility
const legacyAsset = {
  // ... existing code
};

return res.status(201).json(legacyAsset);
```

## User Experience Flow

### Before Implementation
1. User scans PSA slab
2. Asset created and saved
3. User sees asset with no pricing data
4. User must manually click refresh button
5. Sales data appears after refresh

### After Implementation
1. User scans PSA slab
2. Asset created and saved
3. API response returns immediately
4. Background sales fetch begins automatically
5. Sales data appears in UI within 5-10 seconds (via React Query cache updates)

## Technical Flow
1. Asset creation completes successfully
2. Response returns to frontend instantly (no blocking)
3. `setImmediate` queues sales fetch for next event loop iteration
4. Background task uses existing refresh pipeline:
   - cardFinder → searchBuilder → ebaySearch → salesSaver
   - Calls Supabase Edge Function with Countdown API
   - Saves authentic marketplace data to sales_history table
5. Frontend automatically updates via React Query cache invalidation

## Benefits
- **Zero user friction**: No manual refresh required
- **Immediate response**: Asset creation API remains fast
- **Reuses existing code**: Leverages current refresh pipeline
- **Error isolation**: Background failures don't affect asset creation
- **Authentic data**: Uses same marketplace API integration

## Risk Mitigation
- Background failures are logged but don't break asset creation
- Uses fire-and-forget pattern with `setImmediate`
- Maintains all existing error handling and deduplication
- Manual refresh still available as backup

## Dependencies
- Existing refresh system (refreshController, helpers)
- Current Supabase Edge Function integration
- Existing sales_history database table
- React Query for frontend cache management

## Success Metrics
- Reduced manual refresh button usage
- Faster time-to-pricing for new assets
- Improved user onboarding experience
- Zero impact on asset creation performance

## Zero Breaking Changes
- No API contract modifications
- No database schema changes
- No frontend code changes required
- Existing manual refresh functionality preserved
- Backward compatible with all current features