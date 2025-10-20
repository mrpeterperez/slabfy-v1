// 🤖 INTERNAL NOTE:
// Purpose: User-facing invite code validation and consumption routes
// Exports: Express router with public invite code endpoints for user signup
// Feature: invite-system
// Dependencies: express, drizzle-orm, shared/schema, zod
// Note: Admin management routes removed - use CLI tools for code creation/management

import { Router, Request, Response } from "express";
import { db } from "../db";
import { inviteCodes } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Rate limiting map for invite code validation attempts
const validationAttempts = new Map<string, { count: number; lastAttempt: Date }>();


// Check rate limiting for validation attempts - disabled for demo
function checkRateLimit(ip: string): boolean {
  // Only enforce in production; allow freely in dev/demo
  if (process.env.NODE_ENV !== 'production') return true;

  const now = new Date();
  const record = validationAttempts.get(ip);

  if (!record) {
    validationAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  const attempts = record; // type-narrowed by guard above

  // Reset if more than 15 minutes have passed
  if (now.getTime() - attempts.lastAttempt.getTime() > 15 * 60 * 1000) {
    validationAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }

  // Allow max 10 attempts per 15 minutes
  if (attempts.count >= 10) {
    return false;
  }

  attempts.count += 1;
  attempts.lastAttempt = now;
  validationAttempts.set(ip, attempts);
  return true;
}

// Validation schemas
const validateCodeSchema = z.object({
  code: z.string().min(1).max(50) // Support any reasonable invite code length
});


// POST /api/invite-codes/validate - Validate an invite code
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || 'unknown';
    
    // Check rate limiting
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        isValid: false,
        error: 'Too many validation attempts. Please try again in 15 minutes.'
      });
    }

    const { code } = validateCodeSchema.parse(req.body);

    const [inviteCode] = await db
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.code, code.toUpperCase()))
      .limit(1);

    if (!inviteCode) {
      return res.json({
        isValid: false,
        error: 'Invalid invite code'
      });
    }

    // Check if code is active
    if (!inviteCode.isActive) {
      return res.json({
        isValid: false,
        error: 'This invite code has been deactivated'
      });
    }

    // Check if code has expired
    if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
      return res.json({
        isValid: false,
        error: 'This invite code has expired'
      });
    }

    // Check if code has reached max uses
    if ((inviteCode.currentUses ?? 0) >= (inviteCode.maxUses ?? 1)) {
      return res.json({
        isValid: false,
        error: 'This invite code has reached its usage limit'
      });
    }

    res.json({
      isValid: true,
      code: inviteCode
    });

  } catch (error) {
    console.error('Invite code validation error:', error);
    res.status(400).json({
      isValid: false,
      error: 'Invalid request format'
    });
  }
});

// POST /api/invite-codes/use - Use an invite code during registration
router.post('/use', async (req: Request, res: Response) => {
  try {
    const { code } = validateCodeSchema.parse(req.body);
    const upperCode = code.toUpperCase();
    const now = new Date();

    // Atomic update: only increment if all constraints are met
    // This prevents race conditions by doing validation and update in one atomic operation
    const result = await db
      .update(inviteCodes)
      .set({ 
        currentUses: sql`${inviteCodes.currentUses} + 1`,
        usedAt: sql`CASE WHEN ${inviteCodes.currentUses} + 1 >= ${inviteCodes.maxUses} THEN ${now} ELSE ${inviteCodes.usedAt} END`
      })
      .where(
        and(
          eq(inviteCodes.code, upperCode),
          eq(inviteCodes.isActive, true),
          sql`(${inviteCodes.expiresAt} IS NULL OR ${inviteCodes.expiresAt} > ${now})`,
          sql`${inviteCodes.currentUses} < ${inviteCodes.maxUses}`
        )
      )
      .returning({ id: inviteCodes.id });

    // Check if the update succeeded (affected exactly 1 row)
    if (result.length === 0) {
      // Atomic update failed, need to determine the specific reason
      const [inviteCode] = await db
        .select({
          id: inviteCodes.id,
          isActive: inviteCodes.isActive,
          expiresAt: inviteCodes.expiresAt,
          currentUses: inviteCodes.currentUses,
          maxUses: inviteCodes.maxUses
        })
        .from(inviteCodes)
        .where(eq(inviteCodes.code, upperCode))
        .limit(1);

      if (!inviteCode) {
        return res.status(400).json({
          success: false,
          error: 'Invalid invite code',
          errorCode: 'INVITE_INVALID'
        });
      }

      if (!inviteCode.isActive) {
        return res.status(400).json({
          success: false,
          error: 'This invite code has been deactivated',
          errorCode: 'INVITE_INACTIVE'
        });
      }

      if (inviteCode.expiresAt && now > inviteCode.expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'This invite code has expired',
          errorCode: 'INVITE_EXPIRED'
        });
      }

      if ((inviteCode.currentUses ?? 0) >= (inviteCode.maxUses ?? 1)) {
        return res.status(400).json({
          success: false,
          error: 'This invite code has reached its usage limit',
          errorCode: 'INVITE_EXHAUSTED'
        });
      }

      // Fallback error (shouldn't happen)
      return res.status(400).json({
        success: false,
        error: 'Unable to use invite code',
        errorCode: 'INVITE_UNKNOWN_ERROR'
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Invite code usage error:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid request format'
    });
  }
});


export default router;