// 🤖 INTERNAL NOTE:
// Purpose: Bulk operations for collections (archive/unarchive/delete multiple)
// Exports: Express router with bulk archive, unarchive, and delete routes
// Feature: collections (server)
// Dependencies: storage, zod, supabase auth

import { Router } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../../supabase";
import { storage } from "../../storage-mod/registry";

const router = Router();

// Bulk operations schema for validation
const bulkCollectionOperationSchema = z.object({
  collectionIds: z.array(z.string()).min(1)
});

/**
 * @swagger
 * /api/collections/bulk/archive:
 *   patch:
 *     summary: Bulk archive collections
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Collections archived successfully
 */
router.patch("/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { collectionIds } = bulkCollectionOperationSchema.parse(req.body);
    
    // Verify ownership of all collections before bulk operation
    for (const collectionId of collectionIds) {
      const existing = await storage.getCollectionById(collectionId);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ 
          error: `Access denied for collection: ${collectionId}` 
        });
      }
    }

    // Perform bulk archive
    let archivedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    for (const collectionId of collectionIds) {
      try {
        await storage.archiveCollection(collectionId);
        archivedCount++;
      } catch (error) {
        console.error(`Failed to archive collection ${collectionId}:`, error);
        errors.push({ 
          id: collectionId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return res.json({
      success: true,
      archivedCount,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0 
        ? `Archived ${archivedCount} of ${collectionIds.length} collections. ${errors.length} failed.`
        : `Successfully archived ${archivedCount} collection(s)`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk archiving collections:", error);
    res.status(500).json({ error: "Failed to archive collections" });
  }
});

/**
 * @swagger
 * /api/collections/bulk/unarchive:
 *   patch:
 *     summary: Bulk unarchive collections
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Collections unarchived successfully
 */
router.patch("/unarchive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { collectionIds } = bulkCollectionOperationSchema.parse(req.body);
    
    // Verify ownership of all collections before bulk operation
    for (const collectionId of collectionIds) {
      const existing = await storage.getCollectionById(collectionId);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ 
          error: `Access denied for collection: ${collectionId}` 
        });
      }
    }

    // Perform bulk unarchive
    let unarchivedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    for (const collectionId of collectionIds) {
      try {
        await storage.unarchiveCollection(collectionId);
        unarchivedCount++;
      } catch (error) {
        console.error(`Failed to unarchive collection ${collectionId}:`, error);
        errors.push({ 
          id: collectionId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return res.json({
      success: true,
      unarchivedCount,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0 
        ? `Restored ${unarchivedCount} of ${collectionIds.length} collections. ${errors.length} failed.`
        : `Successfully restored ${unarchivedCount} collection(s)`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk unarchiving collections:", error);
    res.status(500).json({ error: "Failed to unarchive collections" });
  }
});

/**
 * @swagger
 * /api/collections/bulk/delete:
 *   delete:
 *     summary: Bulk delete collections (archived only)
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               collectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Collections deleted successfully
 */
router.delete("/delete", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { collectionIds } = bulkCollectionOperationSchema.parse(req.body);
    
    // Verify ownership and archived status before bulk delete
    for (const collectionId of collectionIds) {
      const existing = await storage.getCollectionById(collectionId);
      if (!existing || existing.userId !== userId) {
        return res.status(403).json({ 
          error: `Access denied for collection: ${collectionId}` 
        });
      }
      // Only allow deletion of archived collections for safety
      if (!existing.archived) {
        return res.status(400).json({ 
          error: `Cannot delete non-archived collection: ${collectionId}. Archive it first.` 
        });
      }
    }

    // Perform bulk delete
    let deletedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    for (const collectionId of collectionIds) {
      try {
        const deleted = await storage.deleteCollection(collectionId);
        if (deleted) {
          deletedCount++;
        } else {
          errors.push({ id: collectionId, error: 'Delete operation returned false' });
        }
      } catch (error) {
        console.error(`Failed to delete collection ${collectionId}:`, error);
        errors.push({ 
          id: collectionId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return res.json({
      success: true,
      deletedCount,
      failedCount: errors.length,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length > 0 
        ? `Deleted ${deletedCount} of ${collectionIds.length} collections. ${errors.length} failed.`
        : `Successfully deleted ${deletedCount} collection(s)`
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error bulk deleting collections:", error);
    res.status(500).json({ error: "Failed to delete collections" });
  }
});

export default router;
