// 🤖 INTERNAL NOTE:
// Purpose: Bulk pricing operations for consignment assets
// Exports: Express router with single bulk update endpoint
// Feature: consignments (server)
// Dependencies: supabase auth, db scoping

import { Router } from "express";
import { AuthenticatedRequest } from "../../supabase";
import { withUserDb } from "../../db";
import { createStorage } from "../../storage-mod/registry";

const router = Router();

const normalizeKey = (v?: string) => (v || "").toString().trim().toLowerCase().replace(/[\s-]+/g, "_");

/**
 * @swagger
 * /api/consignments/{id}/assets/bulk:
 *   put:
 *     summary: Bulk update multiple consignment assets
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               listPrice:
 *                 type: number
 *               reserve:
 *                 type: number
 *               split:
 *                 type: number
 *               status:
 *                 type: string
 */
router.put("/:id/assets/bulk", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id: consignmentId } = req.params;
    const { assetIds, listPrice, reserve, split, status } = req.body;
    
    // Validate assetIds
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: "assetIds required" });
    }
    
    // Validate at least one field is present
    if (listPrice === undefined && reserve === undefined && split === undefined && status === undefined) {
      return res.status(400).json({ error: "At least one field required" });
    }

    // Validate fields BEFORE entering withUserDb to avoid response issues
    if (listPrice !== undefined && (typeof listPrice !== 'number' || listPrice < 0)) {
      return res.status(400).json({ error: "Invalid list price" });
    }
    
    if (reserve !== undefined && (typeof reserve !== 'number' || reserve < 0)) {
      return res.status(400).json({ error: "Invalid reserve" });
    }
    
    if (split !== undefined && (typeof split !== 'number' || split < 0 || split > 100)) {
      return res.status(400).json({ error: "Invalid split" });
    }
    
    if (status !== undefined && (typeof status !== 'string' || status.length === 0)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Build updates object
    const updates: any = {};
    
    if (listPrice !== undefined) {
      updates.askingPrice = listPrice;
    }
    
    if (reserve !== undefined) {
      updates.reservePrice = reserve.toString();
    }
    
    if (split !== undefined) {
      updates.splitPercentage = split.toString();
    }
    
    if (status !== undefined) {
      const normalizedStatus = normalizeKey(status);
      updates.status = normalizedStatus;
      
      if (normalizedStatus === 'active') {
        updates.listedAt = new Date();
      }
    }

    // Execute bulk update within DB scope
    const result = await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);
      
      let updatedCount = 0;
      const errors: string[] = [];
      
      for (const assetId of assetIds) {
        try {
          const updated = await scopedStorage.updateConsignmentAsset(consignmentId, assetId, updates);
          if (updated) {
            updatedCount++;
          } else {
            errors.push(`Asset ${assetId} not found`);
          }
        } catch (err) {
          errors.push(`Failed to update asset ${assetId}: ${err}`);
        }
      }
      
      return { 
        success: true,
        updated: updatedCount,
        total: assetIds.length,
        errors: errors.length > 0 ? errors : undefined
      };
    });
    
    return res.json(result);
  } catch (error) {
    console.error("Error bulk updating:", error);
    res.status(500).json({ error: "Failed to bulk update" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}/assets/bulk:
 *   delete:
 *     summary: Bulk delete multiple consignment assets
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               assetIds:
 *                 type: array
 *                 items:
 *                   type: string
 */
router.delete("/:id/assets/bulk", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id: consignmentId } = req.params;
    const { assetIds } = req.body;
    
    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return res.status(400).json({ error: "assetIds required" });
    }

    const result = await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);
      
      let deletedCount = 0;
      const errors: string[] = [];
      
      for (const assetId of assetIds) {
        try {
          const success = await scopedStorage.removeAssetFromConsignment(consignmentId, assetId);
          if (success) {
            deletedCount++;
          } else {
            errors.push(`Asset ${assetId} not found`);
          }
        } catch (err) {
          errors.push(`Failed to delete asset ${assetId}: ${err}`);
        }
      }
      
      return { 
        success: true,
        deleted: deletedCount,
        total: assetIds.length,
        errors: errors.length > 0 ? errors : undefined
      };
    });

    return res.json(result);
  } catch (error) {
    console.error("Error bulk deleting:", error);
    res.status(500).json({ error: "Failed to bulk delete" });
  }
});

export default router;
