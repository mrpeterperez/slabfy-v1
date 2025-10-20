// 🤖 INTERNAL NOTE:
// Purpose: Bulk operations for events (archive/unarchive/delete multiple)
// Exports: Express router with bulk archive, unarchive, and delete routes
// Feature: events (server)
// Dependencies: storage, zod, auth

import { Router } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../../supabase";
import { storage } from "../../storage-mod/registry";

const router = Router();

// Bulk operations schema for validation
const bulkEventOperationSchema = z.object({
  eventIds: z.array(z.string()).min(1)
});

/**
 * Bulk archive events
 */
router.patch("/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { eventIds } = bulkEventOperationSchema.parse(req.body);
    
    let archivedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const eventId of eventIds) {
      try {
        const existing = await storage.getEvent(eventId);
        if (!existing || existing.userId !== userId) {
          errors.push({ id: eventId, error: "Event not found or unauthorized" });
          continue;
        }
        await storage.updateEvent(eventId, { archived: true });
        archivedCount++;
      } catch (error: any) {
        errors.push({ id: eventId, error: error?.message || "Unknown error" });
      }
    }

    const failedCount = eventIds.length - archivedCount;
    return res.json({
      success: true,
      archivedCount,
      failedCount,
      errors,
      message: `Successfully archived ${archivedCount} of ${eventIds.length} event(s)`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("[BULK ARCHIVE EVENTS ERROR]", error);
    res.status(500).json({ error: "Failed to archive events" });
  }
});

/**
 * Bulk unarchive events
 */
router.patch("/unarchive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { eventIds } = bulkEventOperationSchema.parse(req.body);
    
    let unarchivedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const eventId of eventIds) {
      try {
        const existing = await storage.getEvent(eventId);
        if (!existing || existing.userId !== userId) {
          errors.push({ id: eventId, error: "Event not found or unauthorized" });
          continue;
        }
        await storage.updateEvent(eventId, { archived: false });
        unarchivedCount++;
      } catch (error: any) {
        errors.push({ id: eventId, error: error?.message || "Unknown error" });
      }
    }

    const failedCount = eventIds.length - unarchivedCount;
    return res.json({
      success: true,
      unarchivedCount,
      failedCount,
      errors,
      message: `Successfully unarchived ${unarchivedCount} of ${eventIds.length} event(s)`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk unarchiving events:", error);
    res.status(500).json({ error: "Failed to unarchive events" });
  }
});

/**
 * Bulk delete events (only archived events can be deleted)
 */
router.delete("/delete", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { eventIds } = bulkEventOperationSchema.parse(req.body);
    
    let deletedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const eventId of eventIds) {
      try {
        const existing = await storage.getEvent(eventId);
        if (!existing || existing.userId !== userId) {
          errors.push({ id: eventId, error: "Event not found or unauthorized" });
          continue;
        }
        if (!existing.archived) {
          errors.push({ id: eventId, error: "Must be archived before deleting" });
          continue;
        }
        await storage.deleteEvent(eventId);
        deletedCount++;
      } catch (error: any) {
        errors.push({ id: eventId, error: error?.message || "Unknown error" });
      }
    }

    const failedCount = eventIds.length - deletedCount;
    return res.json({
      success: true,
      deletedCount,
      failedCount,
      errors,
      message: `Successfully deleted ${deletedCount} of ${eventIds.length} event(s)`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk deleting events:", error);
    res.status(500).json({ error: "Failed to delete events" });
  }
});

export default router;
