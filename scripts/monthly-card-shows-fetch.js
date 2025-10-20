#!/usr/bin/env node

/**
 * Monthly Card Shows Fetch Script
 * Runs monthly to update card shows from Sports Collectors Digest
 * Usage: node scripts/monthly-card-shows-fetch.js
 */

const fetch = require('node-fetch');

async function fetchMonthlyCardShows() {
  try {
    console.log('Starting monthly card shows fetch...');
    
    const response = await fetch('http://localhost:5000/api/card-shows/fetch-monthly', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Monthly fetch completed:', data);
    
    if (data.success) {
      console.log(`✓ Successfully added ${data.count} shows`);
    } else {
      console.error('✗ Fetch failed:', data.error);
    }
    
  } catch (error) {
    console.error('Monthly fetch error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fetchMonthlyCardShows();
}

module.exports = { fetchMonthlyCardShows };