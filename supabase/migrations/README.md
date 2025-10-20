# Migrations

Authoritative, incremental database migrations that can be applied in any environment.

Guidelines:
- One logical change per file, named with date prefixes when helpful (e.g., `20250105_add_public_assets_bucket.sql`).
- Migrations should be idempotent where possible (use IF NOT EXISTS, DROP POLICY IF EXISTS, etc.).
- Include RLS policies with proper USING and WITH CHECK clauses.
- Never rely on ad-hoc scripts for schema; archive those under `supabase/archive/`.

How to apply:
- Dev: run via Supabase SQL editor or CLI in your dev project.
- Prod: apply via CICD or manual review/approval.

Related:
- Storage bucket migration: `20250105000000_create_public_assets_bucket.sql` provisions the `public-assets` bucket and RLS.
