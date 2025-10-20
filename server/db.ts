import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increased from 10 for better concurrency
  min: 2, // Keep minimum connections alive
  idleTimeoutMillis: 60000, // Increased to 1 minute
  connectionTimeoutMillis: 3000, // Reduced to 3 seconds
  statement_timeout: 30000, // 30 second query timeout
});
export const db = drizzle(pool, { schema });

/**
 * Run DB operations within a request-scoped session that sets RLS context.
 * Sets app.user_id and app.role for the lifetime of the transaction.
 *
 * Usage:
 *   await withUserDb({ userId: req.user?.id, role: 'authenticated' }, async (scopedDb) => {
 *     const storage = new (await import('./storage')).DatabaseStorage(scopedDb);
 *     return storage.getAssetsByUserId(req.user!.id);
 *   })
 */
export async function withUserDb<T>(
  ctx: { userId?: string; role?: 'authenticated' | 'service_role' | 'anon' },
  fn: (scopedDb: ReturnType<typeof drizzle>) => Promise<T>
): Promise<T> {
  // Use standard pg Pool for Supabase PostgreSQL connections
  // ensuring session-level settings persist within the transaction
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (ctx.userId) {
      await client.query(`select set_config('app.user_id', $1, true)`, [ctx.userId]);
    }
    const role = ctx.role || (ctx.userId ? 'authenticated' : 'anon');
    await client.query(`select set_config('app.role', $1, true)`, [role]);

    const scopedDb = drizzle(client, { schema });
    const result = await fn(scopedDb);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch {}
    throw err;
  } finally {
    // release connection back to pool
    client.release();
  }
}
