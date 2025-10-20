#!/usr/bin/env node

// 🔥 SlabFy Local Environment Validator
// Checks if your .env.local is set up correctly

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Simple dotenv parser (no external deps needed)
function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    console.log(`⚠️  No ${filePath} found`);
    return {};
  }
  
  const content = readFileSync(filePath, 'utf8');
  const env = {};
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match && !match[1].startsWith('#')) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  
  return env;
}

// Load .env.local
const localEnv = loadEnvFile('.env.local');
// Merge with process.env for testing
Object.assign(process.env, localEnv);

console.log('🔥 SlabFy Local Environment Validator');
console.log('=====================================\n');

const checks = [];

// Required variables
const required = {
  'DATABASE_URL': 'Database connection',
  'SUPABASE_URL': 'Supabase project URL', 
  'SUPABASE_SERVICE_KEY': 'Supabase service key'
};

// Optional but recommended  
const optional = {
  'SUPABASE_ANON_KEY': 'Supabase anon key',
  'PRICING_API_KEY': 'eBay pricing data',
  'GROQ_API_KEY': 'AI sales filtering'
};

// Check required variables
console.log('🎯 Checking required variables...');
for (const [key, desc] of Object.entries(required)) {
  const value = process.env[key];
  if (value) {
    console.log(`  ✅ ${key}: ${desc}`);
    checks.push({ key, status: 'ok', required: true });
  } else {
    console.log(`  ❌ ${key}: ${desc} (MISSING)`);
    checks.push({ key, status: 'missing', required: true });
  }
}

console.log('\n🔧 Checking optional variables...');
for (const [key, desc] of Object.entries(optional)) {
  const value = process.env[key];
  if (value) {
    console.log(`  ✅ ${key}: ${desc}`);
    checks.push({ key, status: 'ok', required: false });
  } else {
    console.log(`  ⚠️  ${key}: ${desc} (optional, but recommended)`);
    checks.push({ key, status: 'missing', required: false });
  }
}

// Environment checks
console.log('\n⚙️ Environment configuration...');
const nodeEnv = process.env.NODE_ENV || 'development';
const port = process.env.PORT || '5000';

console.log(`  📍 NODE_ENV: ${nodeEnv}`);
console.log(`  🌐 PORT: ${port}`);

// Validate specific formats
console.log('\n🔍 Validating formats...');

if (process.env.DATABASE_URL) {
  if (process.env.DATABASE_URL.startsWith('postgresql://')) {
    console.log('  ✅ DATABASE_URL format looks good');
  } else {
    console.log('  ⚠️  DATABASE_URL should start with postgresql://');
  }
}

if (process.env.SUPABASE_URL) {
  if (process.env.SUPABASE_URL.startsWith('https://') && process.env.SUPABASE_URL.includes('supabase.co')) {
    console.log('  ✅ SUPABASE_URL format looks good');
  } else {
    console.log('  ⚠️  SUPABASE_URL should be https://your-project.supabase.co');
  }
}

if (process.env.SUPABASE_SERVICE_KEY) {
  if (process.env.SUPABASE_SERVICE_KEY.length > 100) {
    console.log('  ✅ SUPABASE_SERVICE_KEY length looks good');
  } else {
    console.log('  ⚠️  SUPABASE_SERVICE_KEY seems too short');
  }
}

// Summary
const missingRequired = checks.filter(c => c.required && c.status === 'missing');
const missingOptional = checks.filter(c => !c.required && c.status === 'missing');

console.log('\n📊 Summary:');
console.log('===========');

if (missingRequired.length === 0) {
  console.log('✅ All required variables are set!');
  console.log('🚀 You should be able to run: npm run dev');
} else {
  console.log(`❌ Missing ${missingRequired.length} required variables`);
  console.log('💡 Check your .env.local file and Railway dashboard');
}

if (missingOptional.length > 0) {
  console.log(`⚠️  ${missingOptional.length} optional variables missing (some features may be limited)`);
}

console.log('\n🔧 Next steps:');
if (missingRequired.length > 0) {
  console.log('1. Fix missing required variables in .env.local');
  console.log('2. Copy values from Railway dashboard');
  console.log('3. Run this script again');
} else {
  console.log('1. Run: npm install');
  console.log('2. Run: npm run dev'); 
  console.log('3. Open: http://localhost:5000');
}

console.log('\n💪 Happy coding!');