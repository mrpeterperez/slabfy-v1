# Card Grouping Implementation Plan

## Phase 1: Database Schema Updates (15 minutes)

### Step 1.1: Add card_id columns
```sql
ALTER TABLE global_assets ADD COLUMN card_id TEXT;
ALTER TABLE sales_history ADD COLUMN card_id TEXT;
```

### Step 1.2: Add performance indexes
```sql
CREATE INDEX idx_global_assets_card_id ON global_assets(card_id);
CREATE INDEX idx_sales_history_card_id ON sales_history(card_id);
```

### Step 1.3: Update Drizzle schema
- Add `card_id` field to `globalAssets` table definition
- Add `card_id` field to `salesHistory` table definition
- Run `npm run db:push` to apply changes

## Phase 2: Card ID Generation (30 minutes)

### Step 2.1: Create card ID utility function
- File: `server/routes/helpers/cardIdGenerator.ts`
- Function to generate consistent card_id from PSA data
- Sanitize special characters for database compatibility

### Step 2.2: Update asset creation logic
- Modify global asset creation to generate and assign card_id
- Use PSA metadata (player, set, year, grade, cardNumber, variant)
- Ensure card_id generation happens during asset creation

### Step 2.3: Update existing assets (backfill)
- Create migration script to generate card_id for existing assets
- Apply to current Cooper Flagg and Caitlin Clark assets

## Phase 3: Sales System Updates (45 minutes)

### Step 3.1: Update sales saving logic
- Modify `salesSaver.ts` to include card_id when saving sales
- Get card_id from global_asset during sales save process
- Maintain both global_asset_id (audit) and card_id (grouping)

### Step 3.2: Update sales retrieval logic  
- Modify `salesGetter.ts` to query by card_id instead of global_asset_id
- Change query from `WHERE global_asset_id = ?` to `WHERE card_id = ?`
- Ensure backwards compatibility during transition

### Step 3.3: Update sales controller
- Modify `cardFinder.ts` to return card_id along with other data
- Update `salesController.ts` to pass card_id to salesGetter
- Maintain existing API response format

## Phase 4: Testing & Verification (30 minutes)

### Step 4.1: Database verification
- Verify card_id columns exist and are populated
- Check indexes are created and performing well
- Confirm data integrity across tables

### Step 4.2: Functional testing
- Test asset creation generates correct card_id
- Verify identical cards get same card_id
- Test sales data shows consistently across identical cards

### Step 4.3: Performance testing
- Verify query performance remains under 100ms
- Test sales retrieval with new card_id queries
- Confirm no performance degradation

## File Modifications Required

### 1. `shared/schema.ts`
- Add `cardId: text("card_id")` to globalAssets table
- Add `cardId: text("card_id")` to salesHistory table

### 2. `server/routes/helpers/cardIdGenerator.ts` (NEW)
- Create generateCardId() function
- Handle PSA data standardization
- Sanitize for database compatibility

### 3. `server/routes/helpers/salesSaver.ts`
- Add card_id parameter to saveSales function
- Include cardId in sales record creation
- Maintain global_asset_id for audit trail

### 4. `server/routes/helpers/salesGetter.ts`
- Change query to use card_id instead of global_asset_id
- Update function signature to accept card_id
- Maintain existing response format

### 5. `server/routes/helpers/cardFinder.ts`
- Add card_id to Card interface
- Include cardId in database query
- Return card_id in result object

### 6. Asset creation logic in `server/routes.ts`
- Generate card_id during global asset creation
- Use PSA metadata for card_id generation
- Assign card_id to new global assets

## Success Validation

### Immediate Tests
1. Create two identical Cooper Flagg assets with different cert numbers
2. Verify both generate same card_id
3. Verify both show identical sales data
4. Confirm individual asset navigation works
5. Check audit trail (can see which cert contributed each sale)

### Performance Tests
1. Query response time remains under 100ms
2. Database indexes performing correctly
3. No N+1 query issues introduced

### Data Integrity Tests
1. All existing assets have card_id populated
2. All sales records have card_id populated
3. Orphaned records check (all card_ids have corresponding assets)

## Rollback Plan
If issues arise:
1. Revert salesGetter.ts to query by global_asset_id
2. Disable card_id generation in asset creation
3. Remove card_id columns if necessary
4. All existing functionality remains intact

## Timeline
- **Start to finish:** 2 hours
- **Critical path:** Schema → Card ID → Sales System → Testing
- **Deploy:** Immediately after successful validation
- **Monitor:** Query performance and data consistency for 24 hours

## Success Criteria
✅ Identical cards show same sales data  
✅ Individual asset navigation preserved  
✅ Query performance maintained  
✅ Complete audit trail functional  
✅ Zero breaking changes  
✅ Automatic sales propagation working