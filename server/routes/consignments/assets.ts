// 🤖 INTERNAL NOTE:
// Purpose: Asset management within consignments (add, update, remove assets)
// Exports: Express router with asset management routes
// Feature: consignments (server)
// Dependencies: storage, supabase auth, refresh controller

import { Router } from "express";
import { storage } from "../../storage-mod/registry";
import { scheduleSalesRefresh } from '../helpers/controllers/refreshController';
import { authenticateUser, AuthenticatedRequest } from "../../supabase";

const router = Router();

/**
 * @swagger
 * /api/consignments/{id}/assets:
 *   get:
 *     summary: Get all assets for a consignment
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignment assets retrieved successfully
 *       404:
 *         description: Consignment not found
 */
router.get("/:id/assets", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const consignmentId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // First verify the consignment exists and user owns it
    const consignment = await storage.getConsignmentById(consignmentId);
    if (!consignment) {
      return res.status(404).json({ error: "Consignment not found" });
    }
    
    if (consignment.userId !== userId) {
      return res.status(403).json({ error: "You can only access your own consignments" });
    }
    
    const assets = await storage.getConsignmentAssets(consignmentId);
    res.json(assets);
  } catch (error) {
    console.error("Error fetching consignment assets:", error);
    res.status(500).json({ error: "Failed to fetch consignment assets" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}/assets:
 *   post:
 *     summary: Add an asset to a consignment
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               globalAssetId:
 *                 type: string
 *               askingPrice:
 *                 type: number
 *     responses:
 *       201:
 *         description: Asset added to consignment successfully
 *       404:
 *         description: Consignment not found
 */
router.post("/:id/assets", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const consignmentId = req.params.id;
    const { globalAssetId, askingPrice, splitPercentage } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if (!globalAssetId) {
      return res.status(400).json({ error: "globalAssetId is required" });
    }
    
    // First verify the consignment exists and user owns it
    const consignment = await storage.getConsignmentById(consignmentId);
    if (!consignment) {
      return res.status(404).json({ error: "Consignment not found" });
    }
    
    if (consignment.userId !== userId) {
      return res.status(403).json({ error: "You can only add assets to your own consignments" });
    }
    
    // Check for global certificate number uniqueness across entire system
    const { db } = await import("../../db");
    const { consignmentAssets, consignments, collectionAssets, collections, globalAssets } = await import("@shared/schema");
    const { eq, and, ne, isNotNull } = await import("drizzle-orm");
    
    // Get the cert number for the asset being added
    const assetData = await db
      .select({ certNumber: globalAssets.certNumber })
      .from(globalAssets)
      .where(eq(globalAssets.id, globalAssetId))
      .limit(1);

    if (assetData.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    const certNumber = assetData[0].certNumber;
    
    // If no cert number, allow (for ungraded cards)
    if (!certNumber) {
      // Still check if this exact globalAssetId is already in this consignment
      const sameConsignmentAsset = await db
        .select({ id: consignmentAssets.id })
        .from(consignmentAssets)
        .where(and(
          eq(consignmentAssets.globalAssetId, globalAssetId),
          eq(consignmentAssets.consignmentId, consignmentId)
        ))
        .limit(1);
      
      if (sameConsignmentAsset.length > 0) {
        return res.status(409).json({ 
          error: "Asset is already in this consignment",
          details: "This asset has already been added to this consignment."
        });
      }
    } else {
      // Check if this cert number exists ANYWHERE in the system
      const existingInConsignments = await db
        .select({
          id: consignmentAssets.id,
          consignmentId: consignmentAssets.consignmentId,
          consignmentTitle: consignments.title,
          ownerUserId: consignments.userId
        })
        .from(consignmentAssets)
        .innerJoin(globalAssets, eq(consignmentAssets.globalAssetId, globalAssets.id))
        .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
        .where(and(
          eq(globalAssets.certNumber, certNumber),
          ne(consignmentAssets.consignmentId, consignmentId) // Exclude current consignment
        ))
        .limit(1);

      if (existingInConsignments.length > 0) {
        const existing = existingInConsignments[0];
        const ownerText = existing.ownerUserId === userId ? "your" : "another user's";
        return res.status(409).json({ 
          error: "Certificate already exists in system",
          details: `Certificate ${certNumber} already exists in ${ownerText} consignment "${existing.consignmentTitle}". Each certificate can only exist once in the system.`
        });
      }

      const existingInCollections = await db
        .select({
          id: collectionAssets.id,
          collectionId: collectionAssets.collectionId,
          collectionTitle: collections.name,
          ownerUserId: collections.userId
        })
        .from(collectionAssets)
        .innerJoin(globalAssets, eq(collectionAssets.globalAssetId, globalAssets.id))
        .innerJoin(collections, eq(collectionAssets.collectionId, collections.id))
        .where(eq(globalAssets.certNumber, certNumber))
        .limit(1);

      if (existingInCollections.length > 0) {
        const existing = existingInCollections[0];
        const ownerText = existing.ownerUserId === userId ? "your" : "another user's";
        return res.status(409).json({
          error: "Certificate already exists in system", 
          details: `Certificate ${certNumber} already exists in ${ownerText} collection "${existing.collectionTitle}". Each certificate can only exist once in the system.`
        });
      }
    }
    
    // Get market value for the asset to apply pricing strategy
    let marketValue: number | undefined;
    try {
      const { calculateMarketSnapshot } = await import("../market");
      const marketSnapshot = await calculateMarketSnapshot(globalAssetId, false);
      if (marketSnapshot?.averagePrice) {
        marketValue = marketSnapshot.averagePrice;
        console.log(`🎯 Market value for asset ${globalAssetId}: $${marketValue}`);
      }
    } catch (marketError) {
      console.warn('Failed to fetch market value for pricing strategy:', marketError);
      // Continue without market value - will use manual pricing only
    }

    const consignmentAsset = await storage.addAssetToConsignment(consignmentId, globalAssetId, askingPrice, marketValue, splitPercentage);

    // Fire-and-forget background sales refresh so pricing appears automatically
    // Use a small randomized delay to avoid burst concurrency during batch adds
    try {
      const delayMs = Math.floor(Math.random() * 3000) + 2000; // 2-5s
      console.log(`🎯 Scheduling background sales refresh for consignment asset ${consignmentAsset.id} (delay: ${delayMs}ms)`);
      // scheduleSalesRefresh handles dedupe and skips if sales already exist
      scheduleSalesRefresh(consignmentAsset.id, { delayMs, useAIFiltering: true })
        .catch(err => console.warn('scheduleSalesRefresh error (consignments add):', err));
    } catch (bgErr) {
      console.warn('Failed to schedule background sales refresh for consignment asset:', bgErr);
    }

    res.status(201).json(consignmentAsset);
  } catch (error) {
    console.error("Error adding asset to consignment:", error);
    res.status(500).json({ error: "Failed to add asset to consignment" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}/assets/{assetId}:
 *   put:
 *     summary: Update a consignment asset
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               askingPrice:
 *                 type: number
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *               splitPercentage:
 *                 type: number
 *     responses:
 *       200:
 *         description: Consignment asset updated successfully
 *       404:
 *         description: Consignment or asset not found
 */
// Constrain :assetId to UUID-like format so '/:id/assets/bulk' is NOT captured here
router.put("/:id/assets/:assetId([0-9a-fA-F-]{36})", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { id: consignmentId, assetId } = req.params;
    const { askingPrice, reservePrice, splitPercentage, status, notes } = req.body;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Verify the consignment exists and user owns it
    const consignment = await storage.getConsignmentById(consignmentId);
    if (!consignment) {
      return res.status(404).json({ error: "Consignment not found" });
    }
    
    if (consignment.userId !== userId) {
      return res.status(403).json({ error: "You can only update assets in your own consignments" });
    }
    // Only include fields that are explicitly provided (not undefined)
    const updateData: any = {};
    if (askingPrice !== undefined) updateData.askingPrice = askingPrice;
    if (reservePrice !== undefined) updateData.reservePrice = reservePrice;
    if (splitPercentage !== undefined) updateData.splitPercentage = splitPercentage;
    if (notes !== undefined) updateData.notes = notes;
    
    // Normalize status (accept Title Case / spaces / hyphens) to lowercase tokens used in DB
    if (status !== undefined && typeof status === 'string' && status.trim().length > 0) {
      const normalizedStatus = status.trim().toLowerCase().replace(/[\s-]+/g, "_");
      updateData.status = normalizedStatus;
    }
    
    const updatedAsset = await storage.updateConsignmentAsset(consignmentId, assetId, updateData);
    
    if (!updatedAsset) {
      return res.status(404).json({ error: "Consignment asset not found" });
    }
    
    res.json(updatedAsset);
  } catch (error) {
    console.error("Error updating consignment asset:", error);
    res.status(500).json({ error: "Failed to update consignment asset" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}/assets/{assetId}:
 *   delete:
 *     summary: Remove an asset from a consignment
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Asset removed from consignment successfully
 *       404:
 *         description: Consignment or asset not found
 */
router.delete("/:id/assets/:assetId([0-9a-fA-F-]{36})", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { id: consignmentId, assetId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Verify the consignment exists and user owns it
    const consignment = await storage.getConsignmentById(consignmentId);
    if (!consignment) {
      return res.status(404).json({ error: "Consignment not found" });
    }
    
    if (consignment.userId !== userId) {
      return res.status(403).json({ error: "You can only remove assets from your own consignments" });
    }
    
    const success = await storage.removeAssetFromConsignment(consignmentId, assetId);
    
    if (!success) {
      return res.status(404).json({ error: "Consignment asset not found" });
    }
    
    res.status(204).send();
  } catch (error) {
    console.error("Error removing asset from consignment:", error);
    res.status(500).json({ error: "Failed to remove asset from consignment" });
  }
});

export default router;