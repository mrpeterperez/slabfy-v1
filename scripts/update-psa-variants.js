// Script to update PSA assets with missing variant data from cached PSA certificates
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function updatePsaVariants() {
  const client = await pool.connect();
  
  try {
    console.log('Starting PSA variant update process...');
    
    // Get all PSA assets with null variants
    const { rows: assets } = await client.query(`
      SELECT id, cert_number, player_name, set_name, card_number 
      FROM assets 
      WHERE grader = 'PSA' 
      AND cert_number IS NOT NULL 
      AND variant IS NULL
      ORDER BY created_at
    `);
    
    console.log(`Found ${assets.length} PSA assets with missing variant data`);
    
    for (const asset of assets) {
      try {
        console.log(`\nChecking cert ${asset.cert_number} for ${asset.player_name}...`);
        
        // Fetch PSA certificate data
        const response = await fetch(`http://localhost:5000/api/psa-cert/${asset.cert_number}`);
        
        if (!response.ok) {
          console.log(`  ⚠️  Failed to fetch PSA data for cert ${asset.cert_number}`);
          continue;
        }
        
        const psaData = await response.json();
        const variant = psaData.data?.variant;
        
        if (variant) {
          console.log(`  ✓ Found variant: "${variant}"`);
          
          // Update the asset with the variant
          await client.query(
            'UPDATE assets SET variant = $1 WHERE id = $2',
            [variant, asset.id]
          );
          
          console.log(`  ✓ Updated asset ${asset.id} with variant "${variant}"`);
        } else {
          console.log(`  - No variant data available`);
        }
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`  ❌ Error processing cert ${asset.cert_number}:`, error.message);
      }
    }
    
    console.log('\n✅ PSA variant update process completed');
    
  } catch (error) {
    console.error('❌ Error in PSA variant update process:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the update
updatePsaVariants().catch(console.error);