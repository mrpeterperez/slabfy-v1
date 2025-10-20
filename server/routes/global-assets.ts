// 🤖 INTERNAL NOTE:
// Purpose: API routes for global assets (shared card metadata repository)
// Exports: global-assets router with CRUD operations
// Feature: global-assets
// Dependencies: express, drizzle-orm, uuid, shared schema

import { Router } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { 
  globalAssets,
  insertGlobalAssetSchema
} from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import { authenticateUser, AuthenticatedRequest } from "../supabase";
import { scheduleSalesRefresh } from "./helpers/controllers/refreshController";

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

/**
 * @swagger
 * /api/global-assets:
 *   post:
 *     summary: Create or find existing global asset
 *     tags: [Global Assets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - playerName
 *               - setName
 *               - year
 *               - cardNumber
 *               - grader
 *               - grade
 *               - certNumber
 *             properties:
 *               title:
 *                 type: string
 *               playerName:
 *                 type: string
 *               setName:
 *                 type: string
 *               year:
 *                 type: string
 *               cardNumber:
 *                 type: string
 *               variant:
 *                 type: string
 *               grader:
 *                 type: string
 *               grade:
 *                 type: string
 *               certNumber:
 *                 type: string
 *               psaImageFrontUrl:
 *                 type: string
 *               psaImageBackUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Existing global asset found
 *       201:
 *         description: New global asset created
 */
router.post("/", async (req, res) => {
  try {
    // First, check if a global asset with this certificate number already exists
    const existingAsset = await db
      .select()
      .from(globalAssets)
      .where(eq(globalAssets.certNumber, req.body.certNumber))
      .limit(1);

    if (existingAsset.length > 0) {
      console.log(`🌐 global-asset reuse cert=${req.body.certNumber} id=${existingAsset[0].id}`);
      // Kick off background refresh for existing asset so pricing/sales are up to date
      scheduleSalesRefresh(existingAsset[0].id, { delayMs: 500, useAIFiltering: true })
        .then(r => console.log(`🗓️ schedule existing id=${existingAsset[0].id} instant=${r?.instant || false}`))
        .catch(err => console.log(`⚠️ schedule existing failed id=${existingAsset[0].id}`, err?.message));
      // Return existing asset
      return res.status(200).json(existingAsset[0]);
    }

    // Validate request body
    const data = insertGlobalAssetSchema.parse(req.body);

    // Generate card_id for grouping identical cards
    const { generateCardId } = await import('./helpers/cardIdGenerator');
    let cardId;
    try {
      cardId = generateCardId({
        playerName: data.playerName,
        setName: data.setName,
        year: data.year,
        grade: data.grade,
        cardNumber: data.cardNumber,
        variant: data.variant
      });
      console.log(`🔗 Generated card_id: ${cardId}`);
    } catch (error) {
      console.error(`❌ Card ID generation failed:`, error);
      return res.status(400).json({ error: "Failed to generate card ID - missing required PSA data" });
    }

    // Normalize array-like fields for Drizzle insert
    const normalized: any = { ...data };
    if (normalized.assetImages && !Array.isArray(normalized.assetImages)) {
      normalized.assetImages = Array.from(normalized.assetImages as any);
    }

    const newAsset = {
      id: uuidv4(),
      ...normalized,
      cardId: cardId,
    };

  const [createdAsset] = await db
      .insert(globalAssets)
      .values(newAsset)
      .returning();

  // Fire-and-forget background sales refresh so pricing is ready shortly after creation  
  // Small stagger to avoid burst after batch scans
  console.log(`🆕 global-asset create id=${createdAsset.id} cert=${createdAsset.certNumber} cardId=${createdAsset.cardId}`);
  scheduleSalesRefresh(createdAsset.id, { delayMs: 1500, useAIFiltering: true })
    .then(result => {
      console.log(`🗓️ schedule new id=${createdAsset.id} instant=${result?.instant || false}`);
      if (result?.instant) {
        console.log(`⚡ INSTANT: ${createdAsset.id} pricing via existing grouped card data`);
      }
    })
    .catch(err => console.log(`⚠️ schedule new failed id=${createdAsset.id}`, err?.message));

  res.status(201).json(createdAsset);
  } catch (error) {
    console.error("Error creating global asset:", error);
    res.status(500).json({ error: "Failed to create global asset" });
  }
});

/**
 * @swagger
 * /api/global-assets/by-id/{id}:
 *   get:
 *     summary: Get global asset by ID
 *     tags: [Global Assets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Global asset found
 *       404:
 *         description: Global asset not found
 */
router.get("/by-id/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const assetId = req.params.id;
    
    // Input validation: sanitize asset ID
    if (!assetId || assetId.length > 100) {
      return res.status(400).json({ error: "Invalid asset ID format" });
    }
    
    const [asset] = await db
      .select()
      .from(globalAssets)
      .where(eq(globalAssets.id, assetId));

    if (!asset) {
      return res.status(404).json({ error: "Global asset not found" });
    }

    res.json(asset);
  } catch (error) {
    console.error("Error fetching global asset by ID:", error);
    res.status(500).json({ error: "Failed to fetch global asset" });
  }
});

/**
 * @swagger
 * /api/global-assets/{certNumber}:
 *   get:
 *     summary: Get global asset by certificate number
 *     tags: [Global Assets]
 *     parameters:
 *       - in: path
 *         name: certNumber
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Global asset found
 *       404:
 *         description: Global asset not found
 */
router.get("/:certNumber", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const certNumber = req.params.certNumber;
    
    // Input validation: sanitize cert number
    if (!certNumber || certNumber.length > 100) {
      return res.status(400).json({ error: "Invalid cert number format" });
    }
    
    const [asset] = await db
      .select()
      .from(globalAssets)
      .where(eq(globalAssets.certNumber, certNumber));

    if (!asset) {
      return res.status(404).json({ error: "Global asset not found" });
    }

    res.json(asset);
  } catch (error) {
    console.error("Error fetching global asset:", error);
    res.status(500).json({ error: "Failed to fetch global asset" });
  }
});

export default router;