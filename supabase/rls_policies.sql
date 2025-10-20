-- Slabfy Production Database RLS Policies
-- Execute this file in your production Supabase database
-- Last updated: August 15, 2025

-- =============================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE buy_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignors ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE consignment_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_assets ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 2. USERS TABLE POLICIES
-- =============================================

-- Users can only view and update their own profile
CREATE POLICY "Users can view own profile" 
  ON users FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON users FOR UPDATE 
  USING (auth.uid() = id);

-- Allow new user registration
CREATE POLICY "Enable user registration" 
  ON users FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- =============================================
-- 3. USER ASSETS POLICIES
-- =============================================

-- Users can only manage their own assets
CREATE POLICY "Users can view own assets" 
  ON user_assets FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assets" 
  ON user_assets FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assets" 
  ON user_assets FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assets" 
  ON user_assets FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================
-- 4. GLOBAL ASSETS POLICIES
-- =============================================

-- All authenticated users can view global assets (shared data)
CREATE POLICY "Authenticated users can view global assets" 
  ON global_assets FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only allow creation of global assets through API with service role
-- (This prevents direct user manipulation)
CREATE POLICY "Service role can manage global assets" 
  ON global_assets FOR ALL 
  USING (auth.role() = 'service_role');

-- =============================================
-- 5. SALES HISTORY POLICIES
-- =============================================

-- All authenticated users can view sales history (market data)
CREATE POLICY "Authenticated users can view sales history" 
  ON sales_history FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Only service role can manage sales history
CREATE POLICY "Service role can manage sales history" 
  ON sales_history FOR ALL 
  USING (auth.role() = 'service_role');

-- =============================================
-- 6. CONTACTS POLICIES
-- =============================================

-- Users can only manage their own contacts
CREATE POLICY "Users can view own contacts" 
  ON contacts FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own contacts" 
  ON contacts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own contacts" 
  ON contacts FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own contacts" 
  ON contacts FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================
-- 7. SELLERS/BUYERS POLICIES
-- =============================================

-- Users can only manage their own sellers
CREATE POLICY "Users can view own sellers" 
  ON sellers FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sellers" 
  ON sellers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sellers" 
  ON sellers FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sellers" 
  ON sellers FOR DELETE 
  USING (auth.uid() = user_id);

-- Same for buyers
CREATE POLICY "Users can view own buyers" 
  ON buyers FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own buyers" 
  ON buyers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buyers" 
  ON buyers FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own buyers" 
  ON buyers FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================
-- 8. BUY OFFERS POLICIES
-- =============================================

-- Users can only manage their own buy offers
CREATE POLICY "Users can view own buy offers" 
  ON buy_offers FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own buy offers" 
  ON buy_offers FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own buy offers" 
  ON buy_offers FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own buy offers" 
  ON buy_offers FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================
-- 9. EVENTS POLICIES
-- =============================================

-- Users can only manage their own events
CREATE POLICY "Users can view own events" 
  ON events FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own events" 
  ON events FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events" 
  ON events FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own events" 
  ON events FOR DELETE 
  USING (auth.uid() = user_id);

-- =============================================
-- 10. EVENT INVENTORY POLICIES
-- =============================================

-- Users can view event inventory for their events
CREATE POLICY "Users can view own event inventory" 
  ON event_inventory FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_inventory.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create event inventory for own events" 
  ON event_inventory FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_inventory.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own event inventory" 
  ON event_inventory FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_inventory.event_id 
      AND events.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own event inventory" 
  ON event_inventory FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_inventory.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- =============================================
-- 11. CONSIGNORS & CONSIGNMENTS POLICIES
-- =============================================

-- Users can only manage their own consignors
CREATE POLICY "Users can view own consignors" 
  ON consignors FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own consignors" 
  ON consignors FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consignors" 
  ON consignors FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consignors" 
  ON consignors FOR DELETE 
  USING (auth.uid() = user_id);

-- Users can only manage their own consignments
CREATE POLICY "Users can view own consignments" 
  ON consignments FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own consignments" 
  ON consignments FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consignments" 
  ON consignments FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own consignments" 
  ON consignments FOR DELETE 
  USING (auth.uid() = user_id);

-- Users can manage consignment assets for their consignments
CREATE POLICY "Users can view own consignment assets" 
  ON consignment_assets FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM consignments 
      WHERE consignments.id = consignment_assets.consignment_id 
      AND consignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create consignment assets for own consignments" 
  ON consignment_assets FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM consignments 
      WHERE consignments.id = consignment_assets.consignment_id 
      AND consignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own consignment assets" 
  ON consignment_assets FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM consignments 
      WHERE consignments.id = consignment_assets.consignment_id 
      AND consignments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own consignment assets" 
  ON consignment_assets FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM consignments 
      WHERE consignments.id = consignment_assets.consignment_id 
      AND consignments.user_id = auth.uid()
    )
  );

-- =============================================
-- 12. COLLECTIONS POLICIES
-- =============================================

-- Users can only manage their own collections
CREATE POLICY "Users can view own collections" 
  ON collections FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own collections" 
  ON collections FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections" 
  ON collections FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections" 
  ON collections FOR DELETE 
  USING (auth.uid() = user_id);

-- Users can manage collection assets for their collections
CREATE POLICY "Users can view own collection assets" 
  ON collection_assets FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_assets.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create collection assets for own collections" 
  ON collection_assets FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_assets.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own collection assets" 
  ON collection_assets FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_assets.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own collection assets" 
  ON collection_assets FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM collections 
      WHERE collections.id = collection_assets.collection_id 
      AND collections.user_id = auth.uid()
    )
  );

-- =============================================
-- MOVED: RLS policy snapshot now archived at supabase/archive/rls_policies.sql
-- Prefer managing RLS via incremental migrations under supabase/migrations/.
-- =============================================

-- NOTES
-- =============================================

-- 1. These policies ensure users can only access their own data
-- 2. Global assets and sales history are read-only for all authenticated users
-- 3. Service role bypass RLS for system operations
-- 4. Always test policies with different user accounts before production
-- 5. Monitor for any unauthorized access attempts in Supabase logs