import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage-mod/registry";
import { authenticateUser, type AuthenticatedRequest } from "../supabase";
import { 
  insertCollectionSchema, 
  updateCollectionSchema,
  insertCollectionAssetSchema 
} from "@shared/schema";
import bulkRoutes from "./collections/bulk";

const router = Router();

// Mount bulk operations routes with authentication
router.use("/bulk", authenticateUser, bulkRoutes);

/**
 * @swagger
 * /api/collections/summary:
 *   get:
 *     summary: Get collections summary statistics
 *     tags: [Collections]
 *     responses:
 *       200:
 *         description: Collections summary retrieved successfully
 */
router.get("/summary", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const summary = await storage.getCollectionsSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching collections summary:", error);
    res.status(500).json({ error: "Failed to fetch collections summary" });
  }
});

/**
 * @swagger
 * /api/collections:
 *   get:
 *     summary: Get all collections for authenticated user
 *     tags: [Collections]
 *     responses:
 *       200:
 *         description: Collections retrieved successfully
 */
router.get("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Support archived filter: ?archived=true/false
    const archivedParam = req.query.archived as string | undefined;
    let archived: boolean | undefined = undefined;
    if (archivedParam === 'true') {
      archived = true;
    } else if (archivedParam === 'false') {
      archived = false;
    }
    
    const collections = await storage.getCollectionsByUserId(userId, archived);
    // Ensure API returns thumbnailUrl for frontend compatibility
    const mapped = collections.map((c: any) => ({
      ...c,
      thumbnailUrl: c.thumbnailUrl ?? c.coverImageUrl ?? null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

/**
 * @swagger
 * /api/collections/user/{userId}:
 *   get:
 *     summary: Get all collections for a user
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collections retrieved successfully
 */
router.get("/user/:userId", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const requestedUserId = req.params.userId;
    const authenticatedUserId = req.user?.id;
    
    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // SECURITY: Only allow users to access their own collections
    if (requestedUserId !== authenticatedUserId) {
      return res.status(403).json({ error: "You can only access your own collections" });
    }
    
    const collections = await storage.getCollectionsByUserId(requestedUserId);
    const mapped = collections.map((c: any) => ({
      ...c,
      thumbnailUrl: c.thumbnailUrl ?? c.coverImageUrl ?? null,
    }));
    res.json(mapped);
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ error: "Failed to fetch collections" });
  }
});

/**
 * @swagger
 * /api/collections/{id}:
 *   get:
 *     summary: Get a collection by ID
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection retrieved successfully
 *       404:
 *         description: Collection not found
 */
router.get("/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const collectionId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const collection = await storage.getCollectionById(collectionId);
    
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    // SECURITY: Verify user owns the collection before returning data
    if (collection.userId !== userId) {
      return res.status(403).json({ error: "You can only access your own collections" });
    }
    
    // Include thumbnailUrl alias in response
    res.json({ ...collection, thumbnailUrl: (collection as any).coverImageUrl ?? null });
  } catch (error) {
    console.error("Error fetching collection:", error);
    res.status(500).json({ error: "Failed to fetch collection" });
  }
});

/**
 * @swagger
 * /api/collections:
 *   post:
 *     summary: Create a new collection
 *     tags: [Collections]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 */
router.post("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    console.log("Received request body:", JSON.stringify(req.body, null, 2));
    
  // Require authenticated user
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

    // Map thumbnailUrl from client to coverImageUrl expected by schema
    const incoming: any = { ...req.body };
    if (incoming.thumbnailUrl && !incoming.coverImageUrl) {
      incoming.coverImageUrl = incoming.thumbnailUrl;
    }

    const validatedData = insertCollectionSchema.parse(incoming);
    const collection = await storage.createCollection(userId, validatedData);
    
    // Return with thumbnailUrl for frontend compatibility
    res.status(201).json({ ...collection, thumbnailUrl: (collection as any).coverImageUrl ?? null });
  } catch (error) {
    console.error("Error creating collection:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    // Map common DB errors to clearer client messages (safe for production)
    const code = (error as any)?.code;
    if (code === '23503') { // foreign_key_violation
      return res.status(400).json({ error: 'Invalid userId: user does not exist (foreign key violation).' });
    }
    if (code === '23502') { // not_null_violation
      return res.status(400).json({ error: 'Missing required field on collection.' });
    }
    if (code === '42703') { // undefined_column
      return res.status(400).json({ error: 'Unexpected field provided. Please update the app and try again.' });
    }
    res.status(500).json({ error: "Failed to create collection" });
  }
});

/**
 * @swagger
 * /api/collections/{id}:
 *   patch:
 *     summary: Update a collection
 *     tags: [Collections]
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
 */
router.patch("/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const collectionId = req.params.id;
    // Map thumbnailUrl from client to coverImageUrl expected by schema
    const incoming: any = { ...req.body };
    if (incoming.thumbnailUrl && !incoming.coverImageUrl) {
      incoming.coverImageUrl = incoming.thumbnailUrl;
    }
    const validatedData = updateCollectionSchema.parse(incoming);
    
    // Verify collection exists and user owns it
    const existingCollection = await storage.getCollectionById(collectionId);
    if (!existingCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    if (existingCollection.userId !== req.user?.id) {
      return res.status(403).json({ error: "You can only update your own collections" });
    }
    
    const collection = await storage.updateCollection(collectionId, validatedData);
    
    if (!collection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    res.json(collection ? { ...collection, thumbnailUrl: (collection as any).coverImageUrl ?? null } : collection);
  } catch (error) {
    console.error("Error updating collection:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update collection" });
  }
});

/**
 * @swagger
 * /api/collections/{id}/archive:
 *   patch:
 *     summary: Archive a collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection archived successfully
 *       404:
 *         description: Collection not found
 */
router.patch("/:id/archive", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const collectionId = req.params.id;
    
    // Verify collection exists and user owns it
    const existingCollection = await storage.getCollectionById(collectionId);
    if (!existingCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    if (existingCollection.userId !== req.user?.id) {
      return res.status(403).json({ error: "You can only archive your own collections" });
    }
    
    const archivedCollection = await storage.archiveCollection(collectionId);
    
    if (!archivedCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    res.json({ ...archivedCollection, thumbnailUrl: (archivedCollection as any).coverImageUrl ?? null });
  } catch (error) {
    console.error("Error archiving collection:", error);
    res.status(500).json({ error: "Failed to archive collection" });
  }
});

/**
 * @swagger
 * /api/collections/{id}/unarchive:
 *   patch:
 *     summary: Unarchive a collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection unarchived successfully
 *       404:
 *         description: Collection not found
 */
router.patch("/:id/unarchive", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const collectionId = req.params.id;
    
    // Verify collection exists and user owns it
    const existingCollection = await storage.getCollectionById(collectionId);
    if (!existingCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    if (existingCollection.userId !== req.user?.id) {
      return res.status(403).json({ error: "You can only unarchive your own collections" });
    }
    
    const unarchivedCollection = await storage.unarchiveCollection(collectionId);
    
    if (!unarchivedCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    res.json({ ...unarchivedCollection, thumbnailUrl: (unarchivedCollection as any).coverImageUrl ?? null });
  } catch (error) {
    console.error("Error unarchiving collection:", error);
    res.status(500).json({ error: "Failed to unarchive collection" });
  }
});

/**
 * @swagger
 * /api/collections/{id}:
 *   delete:
 *     summary: Delete a collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection deleted successfully
 *       404:
 *         description: Collection not found
 */
router.delete("/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const collectionId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Verify collection exists and user owns it
    const existingCollection = await storage.getCollectionById(collectionId);
    if (!existingCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    if (existingCollection.userId !== userId) {
      return res.status(403).json({ error: "You can only delete your own collections" });
    }
    
    const success = await storage.deleteCollection(collectionId);
    
    if (!success) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    res.json({ message: "Collection deleted successfully" });
  } catch (error) {
    console.error("Error deleting collection:", error);
    res.status(500).json({ error: "Failed to delete collection" });
  }
});

/**
 * @swagger
 * /api/collections/{id}/assets:
 *   get:
 *     summary: Get assets in a collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Collection assets retrieved successfully
 *       403:
 *         description: Forbidden - user does not own this collection
 *       404:
 *         description: Collection not found
 */
router.get("/:id/assets", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const collectionId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Verify collection exists and user owns it
    const existingCollection = await storage.getCollectionById(collectionId);
    if (!existingCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    if (existingCollection.userId !== userId) {
      return res.status(403).json({ error: "Access denied: You do not own this collection" });
    }
    
    // Use the new method that includes ownership information
    const assets = await storage.getCollectionAssetsWithOwnership(collectionId, userId);
    res.json(assets);
  } catch (error) {
    console.error("Error fetching collection assets:", error);
    res.status(500).json({ error: "Failed to fetch collection assets" });
  }
});

/**
 * @swagger
 * /api/collections/{id}/assets:
 *   post:
 *     summary: Add asset to collection
 *     tags: [Collections]
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
 *               notes:
 *                 type: string
 */
router.post("/:id/assets", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const collectionId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Verify collection exists and user owns it
    const existingCollection = await storage.getCollectionById(collectionId);
    if (!existingCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    if (existingCollection.userId !== userId) {
      return res.status(403).json({ error: "You can only add assets to your own collections" });
    }
    
    const validatedData = insertCollectionAssetSchema.parse({
      collectionId,
      ...req.body,
    });

    // Only prevent exact duplicates within THIS collection. Collections are non-exclusive.
    const { db } = await import("../db");
    const { collectionAssets, globalAssets } = await import("@shared/schema");
    const { eq, and } = await import("drizzle-orm");

    // Verify the asset exists
    const assetExists = await db
      .select({ id: globalAssets.id })
      .from(globalAssets)
      .where(eq(globalAssets.id, validatedData.globalAssetId))
      .limit(1);

    if (assetExists.length === 0) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Check for duplicate in this collection only
    const existingInCollection = await db
      .select({ id: collectionAssets.id })
      .from(collectionAssets)
      .where(and(
        eq(collectionAssets.globalAssetId, validatedData.globalAssetId),
        eq(collectionAssets.collectionId, collectionId)
      ))
      .limit(1);

    if (existingInCollection.length > 0) {
      return res.status(409).json({
        error: "Asset already in collection",
        details: "This asset has already been added to this collection."
      });
    }
    
    const collectionAsset = await storage.addAssetToCollection(validatedData);
    res.status(201).json(collectionAsset);
  } catch (error) {
    console.error("Error adding asset to collection:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to add asset to collection" });
  }
});

/**
 * @swagger
 * /api/collections/{collectionId}/assets/{assetId}:
 *   delete:
 *     summary: Remove asset from collection
 *     tags: [Collections]
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Asset removed from collection successfully
 */
router.delete("/:collectionId/assets/:assetId", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { collectionId, assetId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Verify collection exists and user owns it
    const existingCollection = await storage.getCollectionById(collectionId);
    if (!existingCollection) {
      return res.status(404).json({ error: "Collection not found" });
    }
    
    if (existingCollection.userId !== userId) {
      return res.status(403).json({ error: "You can only remove assets from your own collections" });
    }
    
    const success = await storage.removeAssetFromCollection(collectionId, assetId);
    
    if (!success) {
      return res.status(404).json({ error: "Asset not found in collection" });
    }
    
    res.json({ message: "Asset removed from collection successfully" });
  } catch (error) {
    console.error("Error removing asset from collection:", error);
    res.status(500).json({ error: "Failed to remove asset from collection" });
  }
});

export default router;