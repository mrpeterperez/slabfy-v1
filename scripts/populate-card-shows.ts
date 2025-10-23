#!/usr/bin/env tsx
/**
 * Script to populate card_shows table by calling the fetch-monthly endpoint
 * Run with: npx tsx scripts/populate-card-shows.ts
 */

import fetch from 'node-fetch';

async function populateCardShows() {
  const baseUrl = process.env.VITE_API_URL || 'http://localhost:3001';
  
  console.log('🔍 Fetching card shows from Sports Collectors Digest...');
  console.log(`Using API: ${baseUrl}/api/card-shows/fetch-monthly\n`);
  
  // Note: This endpoint requires authentication, so we'll need to get a token
  // For now, we'll try without auth and see if we need to adjust
  
  try {
    const response = await fetch(`${baseUrl}/api/card-shows/fetch-monthly`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to fetch card shows');
      console.error(`Status: ${response.status} ${response.statusText}`);
      console.error(`Response: ${errorText}`);
      
      if (response.status === 401) {
        console.log('\n💡 This endpoint requires authentication.');
        console.log('You can call it from the browser console while logged in:');
        console.log('  fetch("/api/card-shows/fetch-monthly", { method: "POST" }).then(r => r.json()).then(console.log)');
      }
      
      process.exit(1);
    }
    
    const result = await response.json() as any;
    console.log('✅ Success!');
    console.log(`📊 ${result.message || result.count} shows added to database`);
    console.log('\n', result);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

populateCardShows();
