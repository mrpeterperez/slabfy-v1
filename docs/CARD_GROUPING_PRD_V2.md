# Product Requirements Document: Card Sales Grouping V2

## Problem Statement
Currently, identical cards with different PSA certificate numbers have separate sales histories due to independent API fetches and filtering. This creates inconsistent market data for the same card.

**Example:**
- PSA Cert #98046183: Cooper Flagg Rookie Grade 10 → Shows 11 sales (2 filtered out as bad data)
- PSA Cert #12345678: Cooper Flagg Rookie Grade 10 (identical card) → Shows 12 sales (1 filtered out as bad data)

**Problem:** Same card shows different sales counts due to separate filtering processes on independent API fetches

## Solution Overview
Add a `card_id` field to group identical cards and query sales data by card type rather than individual certificates. PSA data is 100% accurate and standardized - identical cards will always have identical PSA metadata except for the certificate number.

## Key Insight: PSA Data Accuracy
PSA API returns standardized, accurate data. For any given card:
- **Identical cards** → Identical PSA data (player, set, year, grade, variant)
- **Different cards** → Different PSA data
- **Only difference** → Certificate number

This guarantees perfect card grouping with zero edge cases.

## Technical Requirements

### Database Schema Changes
```sql
-- Add card_id to group identical cards
ALTER TABLE global_assets ADD COLUMN card_id TEXT;
ALTER TABLE sales_history ADD COLUMN card_id TEXT;
-- Keep existing global_asset_id for full audit trail
```

### Card ID Generation Logic
```javascript
function generateCardId(psaData) {
  // PSA ensures this data is standardized and accurate
  const components = [
    psaData.playerName,
    psaData.setName, 
    psaData.year,
    psaData.grade,
    psaData.cardNumber,
    psaData.variant || ''
  ].filter(Boolean);
  
  return components.join('_').replace(/[^a-zA-Z0-9_]/g, '_');
}
```

**Example:**
- Cert #114484762 → `"Cooper_Flagg_2024_25_Bowman_U_Now_GEM_MT_10_44"`
- Cert #98765432 → `"Cooper_Flagg_2024_25_Bowman_U_Now_GEM_MT_10_44"` (identical)

### Updated Pipeline Flow
1. **User enters cert #114484762**
2. **PSA API call** → Gets standardized Cooper Flagg data
3. **Card ID generation** → `card_id: "Cooper_Flagg_2024_25_Bowman_U_Now_GEM_MT_10_44"`
4. **Check existing sales** → Query by card_id to see if sales data exists
5. **Search string generation** → "2024-25 BOWMAN U NOW COOPER FLAGG #44 PSA GEM MT 10"
6. **Marketplace API call** → Returns raw sales from eBay (if needed)
7. **AI filtering** → Removes bad listings
8. **Save to database** → Links to both `global_asset_id` (audit) AND `card_id` (grouping)
9. **Future lookups** → Query by `card_id` for consistent data

### Sales Data Structure
```sql
sales_history:
- id (Primary key)
- global_asset_id (Tracks which cert contributed this sale) 
- card_id (Groups sales for querying)
- price, date, seller, etc. (Existing sales fields)
```

### Sales Query Update
```sql
-- Current Query (per certificate)
SELECT * FROM sales_history WHERE global_asset_id = ?

-- New Query (per card type)  
SELECT * FROM sales_history WHERE card_id = (
  SELECT card_id FROM global_assets WHERE id = ?
)
```

## Implementation Plan

### Phase 1: Database Schema (15 minutes)
1. Add `card_id` column to `global_assets` table
2. Add `card_id` column to `sales_history` table  
3. Add database indexes for performance

### Phase 2: Card ID Generation (30 minutes)
1. Create `generateCardId()` function
2. Update asset creation logic to generate card_id from PSA data
3. Add card_id assignment during global asset creation

### Phase 3: Sales System Updates (45 minutes)
1. Update `salesSaver.ts` to include card_id when saving sales
2. Update `salesGetter.ts` to query by card_id instead of global_asset_id
3. Update sales refresh logic to use card_id grouping

### Phase 4: Testing & Verification (30 minutes)
1. Test with duplicate cards showing same sales data
2. Verify individual asset navigation still works  
3. Test sales update propagation across identical cards
4. Verify audit trail functionality

## Expected Outcome

**After implementation:**
- PSA Cert #98046183: Cooper Flagg Rookie Grade 10 → Shows 13 sales
- PSA Cert #12345678: Cooper Flagg Rookie Grade 10 → Shows 13 sales (same data)
- All identical cards automatically share the same sales pool
- Each certificate remains individually navigable
- Complete audit trail of which cert contributed each sale

## Success Criteria
- ✅ Identical cards display the same filtered sales history
- ✅ Sales updates automatically propagate to all identical cards  
- ✅ Individual certificate records and navigation remain intact
- ✅ Full audit trail maintained
- ✅ Query performance remains under 100ms
- ✅ No duplicate sales data for identical card types

## Risk Mitigation
- **Zero breaking changes:** All existing functionality preserved
- **Clean slate advantage:** No legacy data to migrate
- **Rollback friendly:** Can revert to old query logic anytime
- **PSA data accuracy:** Eliminates edge cases and ambiguity

## Timeline
- **Total estimated time:** 2 hours
- **Implementation order:** Schema → Card ID → Sales System → Testing
- **Deploy immediately** after successful testing

## Metrics to Track
- Sales data consistency across identical cards
- Database query performance (target: <100ms)
- Sales update propagation effectiveness  
- Individual asset navigation functionality
- Audit trail completeness