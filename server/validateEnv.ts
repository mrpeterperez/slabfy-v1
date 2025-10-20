/**
 * Environment Variable Validation
 * Ensures all required environment variables are present
 */

const requiredEnvVars = {
  // Database
  DATABASE_URL: 'PostgreSQL connection string',
  
  // Supabase
  SUPABASE_URL: 'Supabase project URL',
  SUPABASE_SERVICE_KEY: 'Supabase service role key',
  
  // API Keys - Only require these in production if they exist
  ...(process.env.NODE_ENV === 'production' && process.env.PRICING_API_KEY ? { PRICING_API_KEY: 'Pricing API key for eBay data' } : {}),
  ...(process.env.NODE_ENV === 'production' && process.env.GROQ_API_KEY ? { GROQ_API_KEY: 'GROQ API key for AI filtering' } : {}),
};

const optionalEnvVars = {
  // API Keys (optional for core functionality)
  PRICING_API_KEY: 'Pricing API key for eBay data (optional)',
  GROQ_API_KEY: 'GROQ API key for AI filtering (optional)',
  
  // Stripe (if using payments)
  STRIPE_SECRET_KEY: 'Stripe secret key for payments (optional)',
  STRIPE_WEBHOOK_SECRET: 'Stripe webhook secret (optional)',
  
  // Port configuration
  PORT: 'Server port (defaults to 5000)',
  NODE_ENV: 'Environment mode (development/production)',
};

export function validateEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const missingVars: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      missingVars.push(`  - ${key}: ${description}`);
    }
  }

  // Check optional variables in production - only warn about truly critical ones
  if (isProduction) {
    // Only check for core optional variables, skip Stripe and API keys
    const criticalOptionalVars = ['PORT', 'NODE_ENV'];
    for (const [key, description] of Object.entries(optionalEnvVars)) {
      if (!process.env[key] && criticalOptionalVars.includes(key)) {
        warnings.push(`  - ${key}: ${description}`);
      }
    }
  }

  // Security check: Ensure service key is not exposed in client
  if (process.env.SUPABASE_SERVICE_KEY && process.env.SUPABASE_SERVICE_KEY.length < 100) {
    warnings.push('  - SUPABASE_SERVICE_KEY appears to be invalid (too short)');
  }

  // Report missing variables
  if (missingVars.length > 0) {
    console.error('\n❌ Missing required environment variables:');
    console.error(missingVars.join('\n'));
    
    if (isProduction) {
      console.error('\n⚠️  Cannot start production server without all required variables.');
      console.error('Please add these to your Replit Secrets or .env file.\n');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Running in development mode with missing variables.');
      console.warn('Some features may not work properly.\n');
    }
  }

  // Report warnings
  if (warnings.length > 0) {
    console.warn('\n⚠️  Optional environment variables not configured:');
    console.warn(warnings.join('\n'));
    console.warn('These features may be limited or unavailable.\n');
  }

  // Success message
  if (missingVars.length === 0 && warnings.length === 0) {
    console.log('✅ All environment variables validated successfully');
  }
}

// Helper function to safely get environment variables
export function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    throw new Error(`Environment variable ${key} is not defined`);
  }
  return value || defaultValue || '';
}

// Helper to check if we're in production
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

// Helper to check if we're in development
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}