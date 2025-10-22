// 🤖 INTERNAL NOTE:
// Purpose: Generate test invite codes for development and testing
// Usage: tsx scripts/generate-test-invite-codes.ts
// Dependencies: drizzle-orm, @shared/schema

import { db } from "../server/db";
import { inviteCodes } from "../shared/schema";
import { eq } from "drizzle-orm";
import { randomBytes } from "crypto";

// Generate a random 8-character alphanumeric code (no confusing chars)
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excludes 0,O,1,I
  let code = "";
  const bytes = randomBytes(8);
  
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  
  return code;
}

async function generateTestCodes() {
  console.log("🔑 Generating test invite codes...\n");

  const testCodes = [
    {
      code: "SLABFY01",
      maxUses: 1,
      isActive: true,
      note: "Test - Single use code for testing signup flow",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    {
      code: "SLABFY02", 
      maxUses: 5,
      isActive: true,
      note: "Test - Multi-use code (5 uses)",
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    {
      code: "SLABFY03",
      maxUses: 1,
      isActive: false,
      note: "Test - Inactive code (should fail validation)",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      code: "EXPIRED1",
      maxUses: 1, 
      isActive: true,
      note: "Test - Expired code (should fail validation)",
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Yesterday
    },
    {
      code: generateCode(),
      maxUses: 10,
      isActive: true,
      note: "Test - High use limit code (10 uses)",
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    },
  ];

  try {
    for (const codeData of testCodes) {
      // Check if code already exists
      const [existing] = await db
        .select()
        .from(inviteCodes)
        .where(eq(inviteCodes.code, codeData.code))
        .limit(1);

      if (existing) {
        console.log(`⏭️  Code ${codeData.code} already exists, skipping...`);
        continue;
      }

      // Insert the code
      await db.insert(inviteCodes).values({
        id: crypto.randomUUID(),
        code: codeData.code,
        maxUses: codeData.maxUses,
        currentUses: 0,
        isActive: codeData.isActive,
        note: codeData.note,
        expiresAt: codeData.expiresAt,
        createdAt: new Date(),
      });

      console.log(`✅ Created code: ${codeData.code}`);
      console.log(`   Status: ${codeData.isActive ? "Active" : "Inactive"}`);
      console.log(`   Max uses: ${codeData.maxUses}`);
      console.log(`   Expires: ${codeData.expiresAt.toLocaleDateString()}`);
      console.log(`   Note: ${codeData.note}\n`);
    }

    console.log("🎉 Test invite codes generated successfully!\n");
    console.log("📋 Summary:");
    console.log("   - SLABFY01: Single use, active");
    console.log("   - SLABFY02: 5 uses, active");
    console.log("   - SLABFY03: Inactive (test failure)");
    console.log("   - EXPIRED1: Expired (test failure)");
    console.log(`   - ${testCodes[4].code}: 10 uses, active\n`);
    
  } catch (error) {
    console.error("❌ Error generating test codes:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the script
generateTestCodes();
