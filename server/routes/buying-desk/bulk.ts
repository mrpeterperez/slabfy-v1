// 🤖 INTERNAL NOTE:
// Purpose: Bulk operations for buying desk sessions (archive/unarchive/delete)
// Exports: Router with bulk endpoints
// Feature: buying-desk
// Dependencies: buying desk service, zod validation

import { Router } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { buyOffers } from "@shared/schema";
import { db } from "../../db";
import type { AuthenticatedRequest } from "../../supabase";

const router = Router();

// Validation schemas
const bulkIdsSchema = z.object({
  sessionIds: z.array(z.string().uuid()).min(1, "At least one session ID is required"),
});

/**
 * @swagger
 * /api/buying-desk/bulk/archive:
 *   patch:
 *     summary: Bulk archive buying sessions
 *     tags: [Buying Desk]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionIds]
 *             properties:
 *               sessionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Bulk archive result with error tracking
 */
router.patch("/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = bulkIdsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request", 
        details: validation.error.errors 
      });
    }

    const { sessionIds } = validation.data;
    let archivedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process each session with error tracking
    for (const sessionId of sessionIds) {
      try {
        // Verify ownership
        const [session] = await db
          .select({ id: buyOffers.id, userId: buyOffers.userId })
          .from(buyOffers)
          .where(eq(buyOffers.id, sessionId))
          .limit(1);

        if (!session) {
          errors.push({ id: sessionId, error: "Session not found" });
          continue;
        }
        if (session.userId !== userId) {
          errors.push({ id: sessionId, error: "Access denied" });
          continue;
        }

        // Archive the session
        await db
          .update(buyOffers)
          .set({ archived: true, updatedAt: new Date() })
          .where(eq(buyOffers.id, sessionId));
        
        archivedCount++;
      } catch (error: any) {
        errors.push({ id: sessionId, error: error.message || "Failed to archive" });
      }
    }

    const failedCount = errors.length;
    const message = failedCount > 0
      ? `Archived ${archivedCount} of ${sessionIds.length} session(s)`
      : `Successfully archived ${archivedCount} session(s)`;

    return res.json({
      success: true,
      archivedCount,
      failedCount,
      errors: failedCount > 0 ? errors : undefined,
      message,
    });
  } catch (error: any) {
    console.error("Bulk archive buying sessions error:", error);
    return res.status(500).json({ error: "Failed to archive sessions" });
  }
});

/**
 * @swagger
 * /api/buying-desk/bulk/unarchive:
 *   patch:
 *     summary: Bulk unarchive (restore) buying sessions
 *     tags: [Buying Desk]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionIds]
 *             properties:
 *               sessionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Bulk unarchive result with error tracking
 */
router.patch("/unarchive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = bulkIdsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request", 
        details: validation.error.errors 
      });
    }

    const { sessionIds } = validation.data;
    let unarchivedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process each session with error tracking
    for (const sessionId of sessionIds) {
      try {
        // Verify ownership
        const [session] = await db
          .select({ id: buyOffers.id, userId: buyOffers.userId })
          .from(buyOffers)
          .where(eq(buyOffers.id, sessionId))
          .limit(1);

        if (!session) {
          errors.push({ id: sessionId, error: "Session not found" });
          continue;
        }
        if (session.userId !== userId) {
          errors.push({ id: sessionId, error: "Access denied" });
          continue;
        }

        // Unarchive the session
        await db
          .update(buyOffers)
          .set({ archived: false, updatedAt: new Date() })
          .where(eq(buyOffers.id, sessionId));
        
        unarchivedCount++;
      } catch (error: any) {
        errors.push({ id: sessionId, error: error.message || "Failed to unarchive" });
      }
    }

    const failedCount = errors.length;
    const message = failedCount > 0
      ? `Unarchived ${unarchivedCount} of ${sessionIds.length} session(s)`
      : `Successfully unarchived ${unarchivedCount} session(s)`;

    return res.json({
      success: true,
      unarchivedCount,
      failedCount,
      errors: failedCount > 0 ? errors : undefined,
      message,
    });
  } catch (error: any) {
    console.error("Bulk unarchive buying sessions error:", error);
    return res.status(500).json({ error: "Failed to unarchive sessions" });
  }
});

/**
 * @swagger
 * /api/buying-desk/bulk/delete:
 *   delete:
 *     summary: Bulk delete buying sessions (only archived sessions can be deleted)
 *     tags: [Buying Desk]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionIds]
 *             properties:
 *               sessionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Bulk delete result with error tracking
 */
router.delete("/delete", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validation = bulkIdsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Invalid request", 
        details: validation.error.errors 
      });
    }

    const { sessionIds } = validation.data;
    let deletedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    // Process each session with error tracking
    for (const sessionId of sessionIds) {
      try {
        // Verify ownership and archived status
        const [session] = await db
          .select({ 
            id: buyOffers.id, 
            userId: buyOffers.userId, 
            archived: buyOffers.archived 
          })
          .from(buyOffers)
          .where(eq(buyOffers.id, sessionId))
          .limit(1);

        if (!session) {
          errors.push({ id: sessionId, error: "Session not found" });
          continue;
        }
        if (session.userId !== userId) {
          errors.push({ id: sessionId, error: "Access denied" });
          continue;
        }
        if (!session.archived) {
          errors.push({ id: sessionId, error: "Session must be archived before deleting" });
          continue;
        }

        // Delete the session (cascade deletes assets)
        await db
          .delete(buyOffers)
          .where(and(
            eq(buyOffers.id, sessionId),
            eq(buyOffers.userId, userId)
          ));
        
        deletedCount++;
      } catch (error: any) {
        errors.push({ id: sessionId, error: error.message || "Failed to delete" });
      }
    }

    const failedCount = errors.length;
    const message = failedCount > 0
      ? `Deleted ${deletedCount} of ${sessionIds.length} session(s)`
      : `Successfully deleted ${deletedCount} session(s)`;

    return res.json({
      success: true,
      deletedCount,
      failedCount,
      errors: failedCount > 0 ? errors : undefined,
      message,
    });
  } catch (error: any) {
    console.error("Bulk delete buying sessions error:", error);
    return res.status(500).json({ error: "Failed to delete sessions" });
  }
});

export default router;
