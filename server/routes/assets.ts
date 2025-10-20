// 🤖 INTERNAL NOTE:
// Purpose: Express router providing CRUD operations for user-specific assets
// Exports: assets router (default)
// Feature: assets
// Dependencies: express, drizzle-orm, @shared/schema, ../db, ../supabase

import { Router, type Request, type Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { userAssets, globalAssets, consignmentAssets, consignments, purchaseTransactions } from "@shared/schema";
import { authenticateUser, AuthenticatedRequest } from "../supabase";
import { createAssetUpdateHandler } from "./assets-update";

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

const assetSelectFields = {
  // User asset fields
  id: userAssets.id,
  userId: userAssets.userId,
  globalAssetId: userAssets.globalAssetId,
  purchasePrice: userAssets.purchasePrice,
  purchaseDate: userAssets.purchaseDate,
  purchaseSource: userAssets.purchaseSource,
  serialNumber: userAssets.serialNumber,
  serialMax: userAssets.serialMax,
  serialNumbered: userAssets.serialNumbered,
  ownershipStatus: userAssets.ownershipStatus,
  notes: userAssets.notes,
  addedAt: userAssets.addedAt,
  updatedAt: userAssets.updatedAt,
  favorited: userAssets.favorited,
  tags: userAssets.tags,
  buyOfferId: userAssets.buyOfferId,
  // Global asset fields
  type: globalAssets.type,
  title: globalAssets.title,
  grader: globalAssets.grader,
  playerName: globalAssets.playerName,
  setName: globalAssets.setName,
  year: globalAssets.year,
  cardNumber: globalAssets.cardNumber,
  variant: globalAssets.variant,
  grade: globalAssets.grade,
  certNumber: globalAssets.certNumber,
  category: globalAssets.category,
  psaImageFrontUrl: globalAssets.psaImageFrontUrl,
  psaImageBackUrl: globalAssets.psaImageBackUrl,
  cardId: globalAssets.cardId,
  assetImages: globalAssets.assetImages,
  totalPopulation: globalAssets.totalPopulation,
  totalPopulationWithQualifier: globalAssets.totalPopulationWithQualifier,
  populationHigher: globalAssets.populationHigher,
  liquidityRating: globalAssets.liquidityRating,
  globalAssetCreatedAt: globalAssets.createdAt,
  globalAssetUpdatedAt: globalAssets.updatedAt,
} as const;

async function fetchAssetForUser(userAssetId: string, userId: string) {
  // First try to find in user assets by user asset ID
  const [userAsset] = await db
    .select(assetSelectFields)
    .from(userAssets)
    .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
    .where(and(
      eq(userAssets.id, userAssetId),
      eq(userAssets.userId, userId),
      eq(userAssets.isActive, true)
    ))
    .limit(1);

  if (userAsset) {
    return userAsset;
  }

  // If not found by user asset ID, try to find in user assets by global asset ID
  const [userAssetByGlobal] = await db
    .select(assetSelectFields)
    .from(userAssets)
    .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
    .where(and(
      eq(userAssets.globalAssetId, userAssetId),
      eq(userAssets.userId, userId),
      eq(userAssets.isActive, true)
    ))
    .limit(1);

  if (userAssetByGlobal) {
    return userAssetByGlobal;
  }

  // If not found in user assets, check consignment assets by consignment asset ID
  // Only return consignment assets if the consignment is active/paused and not archived
  const consignmentAssetSelectFields = {
    // Map consignment asset fields to match user asset structure
    id: consignmentAssets.id,
    userId: consignments.userId,
    globalAssetId: consignmentAssets.globalAssetId,
    consignmentId: consignmentAssets.consignmentId, // Include consignment ID for linking
    purchasePrice: sql<number | null>`NULL`, // Consignment assets don't have purchase price
    purchaseDate: sql<string | null>`NULL`, // Consignment assets don't have purchase date
    purchaseSource: sql<string | null>`NULL`, // Consignment assets don't have purchase source
    serialNumber: sql<number | null>`NULL`, // Consignment assets don't track serial info
    serialMax: sql<number | null>`NULL`,
    serialNumbered: sql<boolean | null>`NULL`,
    ownershipStatus: sql<string>`'consignment'`, // Always consignment for these
    notes: consignmentAssets.notes,
    addedAt: consignmentAssets.addedAt,
    updatedAt: consignmentAssets.updatedAt,
    favorited: sql<boolean | null>`NULL`, // Consignment assets don't have favorited
    tags: sql<string[] | null>`NULL`, // Consignment assets don't have tags
    buyOfferId: sql<string | null>`NULL`, // Consignment assets don't have buy offers
    // Global asset fields
    type: globalAssets.type,
    title: globalAssets.title,
    grader: globalAssets.grader,
    playerName: globalAssets.playerName,
    setName: globalAssets.setName,
    year: globalAssets.year,
    cardNumber: globalAssets.cardNumber,
    variant: globalAssets.variant,
    grade: globalAssets.grade,
    certNumber: globalAssets.certNumber,
    category: globalAssets.category,
    psaImageFrontUrl: globalAssets.psaImageFrontUrl,
    psaImageBackUrl: globalAssets.psaImageBackUrl,
    cardId: globalAssets.cardId,
    assetImages: globalAssets.assetImages,
    totalPopulation: globalAssets.totalPopulation,
    totalPopulationWithQualifier: globalAssets.totalPopulationWithQualifier,
    populationHigher: globalAssets.populationHigher,
    liquidityRating: globalAssets.liquidityRating,
    globalAssetCreatedAt: globalAssets.createdAt,
    globalAssetUpdatedAt: globalAssets.updatedAt,
  };

  const [consignmentAsset] = await db
    .select(consignmentAssetSelectFields)
    .from(consignmentAssets)
    .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
    .innerJoin(globalAssets, eq(consignmentAssets.globalAssetId, globalAssets.id))
    .where(and(
      eq(consignmentAssets.id, userAssetId),
      eq(consignments.userId, userId),
      eq(consignments.archived, false), // Only accessible if consignment is not archived
      sql`${consignments.status} IN ('active', 'paused')` // Only accessible if consignment is active or paused
    ))
    .limit(1);

  if (consignmentAsset) {
    return consignmentAsset;
  }

  // Finally, try to find in consignment assets by global asset ID
  const [consignmentAssetByGlobal] = await db
    .select(consignmentAssetSelectFields)
    .from(consignmentAssets)
    .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
    .innerJoin(globalAssets, eq(consignmentAssets.globalAssetId, globalAssets.id))
    .where(and(
      eq(consignmentAssets.globalAssetId, userAssetId),
      eq(consignments.userId, userId),
      eq(consignments.archived, false), // Only accessible if consignment is not archived
      sql`${consignments.status} IN ('active', 'paused')` // Only accessible if consignment is active or paused
    ))
    .limit(1);

  return consignmentAssetByGlobal;
}

// GET /api/assets/:userAssetId - Get individual asset details with global asset data
router.get("/:userAssetId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userAssetId } = req.params;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    console.log(`🔍 Fetching asset details for userAssetId: ${userAssetId}, user: ${authenticatedUserId}`);

    const asset = await fetchAssetForUser(userAssetId, authenticatedUserId);

    if (!asset) {
      console.log(`❌ Asset not found or user unauthorized: ${userAssetId} for user ${authenticatedUserId}`);
      return res.status(404).json({ error: "Asset not found" });
    }

    console.log(`✅ Found asset details for ${userAssetId}: ${asset.title}`);
    return res.json(asset);

  } catch (error) {
    console.error(`❌ Error fetching asset details for ${req.params.userAssetId}:`, error);
    return res.status(500).json({ error: "Failed to fetch asset details" });
  }
});

// GET /api/assets/ownership/:globalAssetId - Check if user owns a specific global asset
router.get('/ownership/:globalAssetId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { globalAssetId } = req.params;
    const authenticatedUserId = req.user?.id;

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // First check user_assets table for owned/sold assets
    const [userAsset] = await db
      .select({
        id: userAssets.id,
        ownershipStatus: userAssets.ownershipStatus,
        soldAt: userAssets.soldAt,
        soldPrice: userAssets.soldPrice,
        purchasePrice: userAssets.purchasePrice,
        purchaseDate: userAssets.purchaseDate,
      })
      .from(userAssets)
      .where(and(
        eq(userAssets.userId, authenticatedUserId),
        eq(userAssets.globalAssetId, globalAssetId),
        eq(userAssets.isActive, true)
      ))
      .limit(1);

    if (userAsset) {
      return res.json(userAsset);
    }

    // If not found in user_assets, check consignment_assets table
    // Consignment assets are still "owned" by the user for management purposes
    const [consignmentAsset] = await db
      .select({
        id: consignmentAssets.id,
        ownershipStatus: sql<string>`'consignment'`, // Always consignment
        soldAt: sql<string | null>`NULL`, // Consignments don't have soldAt in this table
        soldPrice: sql<number | null>`NULL`, // Consignments don't have soldPrice
        purchasePrice: sql<number | null>`NULL`, // Consignments don't have purchase price
        purchaseDate: sql<string | null>`NULL`, // Consignments don't have purchase date
      })
      .from(consignmentAssets)
      .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
      .where(and(
        eq(consignments.userId, authenticatedUserId),
        eq(consignmentAssets.globalAssetId, globalAssetId),
        eq(consignments.archived, false),
        sql`${consignments.status} IN ('active', 'paused')` // Only active/paused consignments
      ))
      .limit(1);

    // Return consignment data or null if not owned at all
    return res.json(consignmentAsset || null);
  } catch (error) {
    console.error('Error checking asset ownership:', error);
    return res.status(500).json({ error: 'Failed to check ownership' });
  }
});

// PATCH /api/assets/:userAssetId - Update editable asset fields
router.patch("/:userAssetId", createAssetUpdateHandler(fetchAssetForUser));

// DELETE /api/assets/:userAssetId - Soft delete asset (set removedAt, isActive=false)
router.delete('/:userAssetId', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userAssetId } = req.params;
    const authenticatedUserId = req.user?.id;
    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Only allow deleting own asset
    const [asset] = await db
      .select({ id: userAssets.id })
      .from(userAssets)
      .where(and(eq(userAssets.id, userAssetId), eq(userAssets.userId, authenticatedUserId)));

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Soft delete: mark inactive and set removedAt
    await db
      .update(userAssets)
      .set({ isActive: false, removedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(userAssets.id, userAssetId), eq(userAssets.userId, authenticatedUserId)));

    return res.json({ success: true, message: 'Asset deleted' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return res.status(500).json({ error: 'Failed to delete asset' });
  }
});

export default router;