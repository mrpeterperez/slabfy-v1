-- Add fingerprint and last_pricing_update to global_assets for card deduplication
-- Migration: 20250131000000_add_fingerprint_and_pricing_update.sql

-- Add fingerprint column for normalized card identification
ALTER TABLE global_assets 
ADD COLUMN IF NOT EXISTS fingerprint TEXT;

-- Add last_pricing_update timestamp to track when pricing was last fetched
ALTER TABLE global_assets 
ADD COLUMN IF NOT EXISTS last_pricing_update TIMESTAMP;

-- Create index on fingerprint for fast lookups during deduplication
CREATE INDEX IF NOT EXISTS idx_global_assets_fingerprint ON global_assets(fingerprint);

-- Backfill fingerprints for existing cards (PSA cards use cert number as fingerprint)
UPDATE global_assets 
SET fingerprint = cert_number
WHERE cert_number IS NOT NULL 
  AND fingerprint IS NULL;

-- Set last_pricing_update to created_at for existing records (assume they were priced when created)
UPDATE global_assets 
SET last_pricing_update = created_at
WHERE last_pricing_update IS NULL 
  AND created_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN global_assets.fingerprint IS 'Normalized card identifier for deduplication. Format: player|set|year|number|variant|grade|grader (lowercase, sorted). PSA cards use cert_number.';
COMMENT ON COLUMN global_assets.last_pricing_update IS 'Timestamp when pricing data was last fetched from external APIs. Used to determine if pricing needs refresh (>30 days = stale).';
