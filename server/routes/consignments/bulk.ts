// 🤖 INTERNAL NOTE:
// Purpose: Bulk operations for consignments (archive/unarchive multiple)
// Exports: Express router with bulk archive and unarchive routes
// Feature: consignments (server)
// Dependencies: storage, zod, supabase auth, db scoping

import { Router } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../../supabase";
import { withUserDb } from "../../db";
import { createStorage } from "../../storage-mod/registry";

const router = Router();

// Bulk operations schema for validation
const bulkConsignmentOperationSchema = z.object({
  consignmentIds: z.array(z.string()).min(1)
});

/**
 * Bulk archive consignments
 */
router.patch("/bulk/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { consignmentIds } = bulkConsignmentOperationSchema.parse(req.body);
    
    await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);
      let archivedCount = 0;
      const errors: Array<{ id: string; error: string }> = [];
      
      for (const consignmentId of consignmentIds) {
        try {
          const existing = await scopedStorage.getConsignmentById(consignmentId);
          if (!existing || existing.userId !== userId) {
            errors.push({ id: consignmentId, error: "Consignment not found or unauthorized" });
            continue;
          }
          await scopedStorage.archiveConsignment(consignmentId);
          archivedCount++;
        } catch (error: any) {
          errors.push({ id: consignmentId, error: error?.message || "Unknown error" });
        }
      }

      const failedCount = consignmentIds.length - archivedCount;
      return res.json({
        success: true,
        archivedCount,
        failedCount,
        errors,
        message: `Successfully archived ${archivedCount} of ${consignmentIds.length} consignment(s)`,
      });
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("[BULK ARCHIVE ERROR]", error);
    res.status(500).json({ error: "Failed to archive consignments" });
  }
});

router.patch("/bulk/unarchive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { consignmentIds } = bulkConsignmentOperationSchema.parse(req.body);
    
    await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);
      let unarchivedCount = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const consignmentId of consignmentIds) {
        try {
          const existing = await scopedStorage.getConsignmentById(consignmentId);
          if (!existing || existing.userId !== userId) {
            errors.push({ id: consignmentId, error: "Consignment not found or unauthorized" });
            continue;
          }
          await scopedStorage.unarchiveConsignment(consignmentId);
          unarchivedCount++;
        } catch (error: any) {
          errors.push({ id: consignmentId, error: error?.message || "Unknown error" });
        }
      }

      const failedCount = consignmentIds.length - unarchivedCount;
      return res.json({
        success: true,
        unarchivedCount,
        failedCount,
        errors,
        message: `Successfully unarchived ${unarchivedCount} of ${consignmentIds.length} consignment(s)`
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk unarchiving consignments:", error);
    res.status(500).json({ error: "Failed to unarchive consignments" });
  }
});

router.delete("/bulk/delete", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { consignmentIds } = bulkConsignmentOperationSchema.parse(req.body);
    
    await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);
      let deletedCount = 0;
      const errors: Array<{ id: string; error: string }> = [];

      for (const consignmentId of consignmentIds) {
        try {
          const existing = await scopedStorage.getConsignmentById(consignmentId);
          if (!existing || existing.userId !== userId) {
            errors.push({ id: consignmentId, error: "Consignment not found or unauthorized" });
            continue;
          }
          if (!existing.archived) {
            errors.push({ id: consignmentId, error: "Must be archived before deleting" });
            continue;
          }
          const deleted = await scopedStorage.deleteConsignment(consignmentId);
          if (deleted) deletedCount++;
        } catch (error: any) {
          errors.push({ id: consignmentId, error: error?.message || "Unknown error" });
        }
      }

      const failedCount = consignmentIds.length - deletedCount;
      return res.json({
        success: true,
        deletedCount,
        failedCount,
        errors,
        message: `Successfully deleted ${deletedCount} of ${consignmentIds.length} consignment(s)`
      });
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk deleting consignments:", error);
    res.status(500).json({ error: "Failed to delete consignments" });
  }
});

export default router;