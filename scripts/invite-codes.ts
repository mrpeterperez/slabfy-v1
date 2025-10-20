#!/usr/bin/env tsx

/**
 * CLI script for generating invite codes
 * 
 * Usage:
 *   tsx scripts/invite-codes.ts --count 5 --expires 30 --note "New batch for marketing"
 *   tsx scripts/invite-codes.ts --count 1 --expires 0
 *   tsx scripts/invite-codes.ts --help
 * 
 * Arguments:
 *   --count N      Number of codes to generate (default: 1)
 *   --expires DAYS Days until expiration (0 = never expires, optional)
 *   --note TEXT    Note for the codes (optional)
 *   --help         Show help message
 * 
 * Environment Variables:
 *   DATABASE_URL                  Required: Database connection string
 *   INVITE_CREATED_BY_USER_ID     Optional: User ID to set as creator (default: null for CLI)
 */

import { withUserDb } from '../server/db';
import { inviteCodes, users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import process from 'process';
import 'dotenv/config';

// Generate secure invite code using same logic as server/routes/invite-codes.ts
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let result = '';
  
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  
  return result;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    count: 1,
    expires: undefined as number | undefined,
    note: undefined as string | undefined,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--count':
        const countValue = parseInt(args[i + 1]);
        if (isNaN(countValue) || countValue < 1 || countValue > 100) {
          console.error('Error: --count must be a number between 1 and 100');
          process.exit(1);
        }
        options.count = countValue;
        i++; // Skip next arg since we consumed it
        break;
        
      case '--expires':
        const expiresValue = parseInt(args[i + 1]);
        if (isNaN(expiresValue) || expiresValue < 0 || expiresValue > 365) {
          console.error('Error: --expires must be a number between 0 and 365 (0 = never expires)');
          process.exit(1);
        }
        options.expires = expiresValue === 0 ? 0 : expiresValue;
        i++; // Skip next arg since we consumed it
        break;
        
      case '--note':
        const noteValue = args[i + 1];
        if (!noteValue || noteValue.startsWith('--')) {
          console.error('Error: --note requires a text value');
          process.exit(1);
        }
        if (noteValue.length > 255) {
          console.error('Error: --note cannot exceed 255 characters');
          process.exit(1);
        }
        options.note = noteValue;
        i++; // Skip next arg since we consumed it
        break;
        
      case '--help':
      case '-h':
        options.help = true;
        break;
        
      default:
        console.error(`Error: Unknown argument '${arg}'`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Invite Code Generator

Generate secure invite codes and save them to the database.

Usage:
  tsx scripts/invite-codes.ts [options]

Options:
  --count N      Number of codes to generate (default: 1, max: 100)
  --expires DAYS Days until expiration (0 = never expires, max: 365)
  --note TEXT    Note for the codes (optional, max: 255 chars)
  --help, -h     Show this help message

Environment Variables:
  DATABASE_URL                  Required: Database connection string
  INVITE_CREATED_BY_USER_ID     Optional: User ID to set as creator (default: creates system user)

Examples:
  tsx scripts/invite-codes.ts --count 5
  tsx scripts/invite-codes.ts --count 10 --expires 30 --note "Marketing batch"
  tsx scripts/invite-codes.ts --count 1 --expires 0 --note "Never expires"
  INVITE_CREATED_BY_USER_ID=user123 tsx scripts/invite-codes.ts --count 1

Note:
  - If no INVITE_CREATED_BY_USER_ID is provided, the script creates a system user 'system-cli'
  - If INVITE_CREATED_BY_USER_ID is provided, the script validates the user exists first
  - All operations use service_role to bypass RLS constraints for admin operations
`);
}

// Generate unique code and handle database insertion with retry logic
async function insertInviteCodeWithRetry(db: any, baseValues: any, maxRetries = 10): Promise<string> {
  let attempts = 0;
  
  while (attempts < maxRetries) {
    const code = generateInviteCode();
    
    try {
      const [newCode] = await db
        .insert(inviteCodes)
        .values({
          ...baseValues,
          code
        })
        .returning();
        
      return newCode.code;
    } catch (error: any) {
      // Handle PostgreSQL unique_violation error (code 23505) for code conflicts
      if (error.code === '23505' && error.constraint?.includes('code')) {
        attempts++;
        if (attempts < maxRetries) {
          // Retry with a new code
          continue;
        }
      }
      // Handle NOT NULL constraint violations and other errors
      console.error(`Database error on attempt ${attempts + 1}:`, error.message || error);
      throw error;
    }
  }
  
  throw new Error(`Failed to generate unique invite code after ${maxRetries} attempts`);
}

// Create or get system user for CLI operations
async function getSystemUser(db: any): Promise<string> {
  const SYSTEM_USER_ID = 'system-cli';
  const SYSTEM_EMAIL = 'system-cli@internal.app';
  
  try {
    // Try to find existing system user
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, SYSTEM_USER_ID))
      .limit(1);
    
    if (existingUser.length > 0) {
      return SYSTEM_USER_ID;
    }
    
    // Create system user if it doesn't exist
    console.log('Creating system user for CLI operations...');
    const [newUser] = await db
      .insert(users)
      .values({
        id: SYSTEM_USER_ID,
        email: SYSTEM_EMAIL,
        username: 'system-cli',
        name: 'System CLI User',
        onboardingComplete: 'true'
      })
      .returning();
    
    console.log(`✅ Created system user: ${newUser.id}`);
    return newUser.id;
    
  } catch (error: any) {
    console.error('Error creating/finding system user:', error.message || error);
    throw error;
  }
}

// Validate user exists if provided
async function validateUser(db: any, userId: string): Promise<boolean> {
  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    
    return user.length > 0;
  } catch (error) {
    return false;
  }
}

// Main function
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  // Validate environment
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    console.log(`Generating ${options.count} invite code${options.count === 1 ? '' : 's'}...`);

    const result = await withUserDb({ role: 'service_role' }, async (db) => {
      const generatedCodes = [];

      // Calculate expiration date if provided (0 means never expires)
      const expiresAt = options.expires && options.expires > 0
        ? new Date(Date.now() + options.expires * 24 * 60 * 60 * 1000) 
        : null;

      // Determine creator user ID
      let createdBy: string;
      
      if (process.env.INVITE_CREATED_BY_USER_ID) {
        // Validate provided user ID exists
        const userExists = await validateUser(db, process.env.INVITE_CREATED_BY_USER_ID);
        if (!userExists) {
          throw new Error(`User ID '${process.env.INVITE_CREATED_BY_USER_ID}' does not exist in the database`);
        }
        createdBy = process.env.INVITE_CREATED_BY_USER_ID;
        console.log(`Using provided creator user ID: ${createdBy}`);
      } else {
        // Use system user for CLI-generated codes
        createdBy = await getSystemUser(db);
        console.log(`Using system user for CLI operations: ${createdBy}`);
      }

      // Prepare base values for invite code insertion
      const baseValues = {
        id: crypto.randomUUID(),
        createdBy,
        expiresAt,
        maxUses: 1, // Single-use codes by default
        note: options.note,
        currentUses: 0,
        isActive: true
      };

      // Generate codes
      for (let i = 0; i < options.count; i++) {
        try {
          // Generate new UUID for each code
          const codeValues = { ...baseValues, id: crypto.randomUUID() };
          const code = await insertInviteCodeWithRetry(db, codeValues);
          
          generatedCodes.push(code);
          
          // Show progress for multiple codes
          if (options.count > 1) {
            console.log(`Generated code ${i + 1}/${options.count}: ${code}`);
          }
          
        } catch (error: any) {
          console.error(`Error generating code ${i + 1}:`, error.message || error);
          throw error;
        }
      }

      return { generatedCodes, expiresAt, createdBy };
    });

    // Output summary
    console.log(`\n✅ Successfully generated ${result.generatedCodes.length} invite code${result.generatedCodes.length === 1 ? '' : 's'}:`);
    console.log('');
    
    result.generatedCodes.forEach((code, index) => {
      console.log(`${index + 1}. ${code}`);
    });

    console.log('');
    console.log('Configuration:');
    console.log(`- Max uses: 1 (single-use)`);
    console.log(`- Expires: ${result.expiresAt ? result.expiresAt.toLocaleDateString() : 'Never'}`);
    console.log(`- Note: ${options.note || 'None'}`);
    console.log(`- Created by: ${result.createdBy}`);
    console.log(`- Active: Yes`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});