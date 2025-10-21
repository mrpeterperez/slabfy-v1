import pg from 'pg';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// 🔒 Load environment variables (security fix)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

const { Client } = pg;

async function applyMigration() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    throw new Error('❌ DATABASE_URL environment variable is required. Please set it in .env.local');
  }
  
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    const sql = readFileSync('./migrations/add_archived_column_to_events.sql', 'utf8');
    await client.query(sql);
    console.log('✅ Migration applied successfully');
    
    // Verify the column was added
    const result = await client.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'events' AND column_name = 'archived'
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified archived column exists:', result.rows[0]);
    } else {
      console.log('❌ Column not found after migration');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

applyMigration().catch(console.error);
