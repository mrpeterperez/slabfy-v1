import express from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db";
import { 
  buyOffers, 
  evaluationAssets,
  buyListCart, 
  globalAssets,
  userAssets,
  salesTransactions,
  purchaseTransactions,
  sellers,
  contacts,
} from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { scheduleSalesRefresh } from "../helpers/controllers/refreshController";

const router = express.Router();

// Validation schemas
const addAssetSchema = z.object({
  assetId: z.string().optional(),
  certNumber: z.string().optional(),
}).refine(data => data.assetId || data.certNumber, {
  message: "Either assetId or certNumber must be provided"
});

const updateAssetSchema = z.object({
  offerPrice: z.number().min(0).optional(),
  notes: z.string().optional(),
});

// Schema for moving from staging (evaluation) to cart
const moveToCartSchema = z.object({
  evaluationId: z.string(),
  offerPrice: z.number().min(0),
  notes: z.string().optional(),
});

// GET /sessions/:id/assets - Get session assets
router.get("/sessions/:id/assets", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;

    // Verify session ownership
    const session = await db
      .select({ id: buyOffers.id })
      .from(buyOffers)
      .where(and(
        eq(buyOffers.id, sessionId),
        eq(buyOffers.userId, userId)
      ));

    if (!session.length) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Get evaluation assets (status: evaluating)
    const evalAssets = await db
      .select({
        id: evaluationAssets.id,
        sessionId: evaluationAssets.buyOfferId,
        assetId: evaluationAssets.assetId,
        status: sql<string>`'evaluating'`,
        offerPrice: sql<number>`null`,
        notes: evaluationAssets.evaluationNotes,
        addedAt: evaluationAssets.addedAt,
        updatedAt: sql<Date>`null`,
        // Asset details
        assetTitle: globalAssets.title,
        assetPlayerName: globalAssets.playerName,
        assetSetName: globalAssets.setName,
        assetYear: globalAssets.year,
        assetCardNumber: globalAssets.cardNumber,
        assetVariant: globalAssets.variant,
        assetGrader: globalAssets.grader,
        assetGrade: globalAssets.grade,
        assetCertNumber: globalAssets.certNumber,
        assetPsaImageFrontUrl: globalAssets.psaImageFrontUrl,
        assetPsaImageBackUrl: globalAssets.psaImageBackUrl,
      })
      .from(evaluationAssets)
      .leftJoin(globalAssets, eq(evaluationAssets.assetId, globalAssets.id))
      .where(eq(evaluationAssets.buyOfferId, sessionId));

    // Get cart assets (status: ready/purchased)
    const cartAssets = await db
      .select({
        id: buyListCart.id,
        sessionId: buyListCart.buyOfferId,
        assetId: buyListCart.assetId,
        status: sql<string>`'ready'`, // Simplify - all cart items are "ready"
        offerPrice: buyListCart.offerPrice,
        notes: buyListCart.notes,
        addedAt: buyListCart.addedAt,
        updatedAt: sql<Date>`null`,
        purchasePrice: sql<number>`null`,
        marketPriceAtPurchase: sql<number>`null`,
        purchaseDate: sql<Date>`null`,
        userAssetId: sql<string>`null`,
        // Asset details
        assetTitle: globalAssets.title,
        assetPlayerName: globalAssets.playerName,
        assetSetName: globalAssets.setName,
        assetYear: globalAssets.year,
        assetCardNumber: globalAssets.cardNumber,
        assetVariant: globalAssets.variant,
        assetGrader: globalAssets.grader,
        assetGrade: globalAssets.grade,
        assetCertNumber: globalAssets.certNumber,
        assetPsaImageFrontUrl: globalAssets.psaImageFrontUrl,
        assetPsaImageBackUrl: globalAssets.psaImageBackUrl,
      })
      .from(buyListCart)
      .leftJoin(globalAssets, eq(buyListCart.assetId, globalAssets.id))
      .where(eq(buyListCart.buyOfferId, sessionId));

    // Get purchased assets from purchase_transactions
    const purchasedAssets = await db
      .select({
        id: purchaseTransactions.id, // Use transaction ID as the "session asset" ID
        sessionId: sql<string>`${sessionId}`, // Pass session ID for consistency
        assetId: purchaseTransactions.globalAssetId,
        status: sql<string>`'purchased'`, // Status is purchased
        offerPrice: purchaseTransactions.purchasePrice, // Purchase price = offer price
        notes: purchaseTransactions.notes,
        addedAt: purchaseTransactions.purchaseDate, // When purchased
        updatedAt: sql<Date>`null`,
        purchasePrice: purchaseTransactions.purchasePrice,
        marketPriceAtPurchase: purchaseTransactions.marketPriceAtPurchase,
        purchaseDate: purchaseTransactions.purchaseDate,
        userAssetId: purchaseTransactions.userAssetId,
        paymentMethod: purchaseTransactions.paymentMethod,
        realizedProfit: sql<number>`(${purchaseTransactions.marketPriceAtPurchase} - ${purchaseTransactions.purchasePrice})`, // Calculate profit
        sellerContactId: purchaseTransactions.sellerContactId,
        sellerName: purchaseTransactions.sellerName,
        // Asset details
        assetTitle: globalAssets.title,
        assetPlayerName: globalAssets.playerName,
        assetSetName: globalAssets.setName,
        assetYear: globalAssets.year,
        assetCardNumber: globalAssets.cardNumber,
        assetVariant: globalAssets.variant,
        assetGrader: globalAssets.grader,
        assetGrade: globalAssets.grade,
        assetCertNumber: globalAssets.certNumber,
        assetPsaImageFrontUrl: globalAssets.psaImageFrontUrl,
        assetPsaImageBackUrl: globalAssets.psaImageBackUrl,
      })
      .from(purchaseTransactions)
      .leftJoin(globalAssets, eq(purchaseTransactions.globalAssetId, globalAssets.id))
      .where(eq(purchaseTransactions.buyOfferId, sessionId));

    // Type-safe helper for purchased asset data
    interface PurchasedAssetData {
      purchaseDate?: Date;
      paymentMethod?: string;
      realizedProfit?: number;
      sellerContactId?: string;
      sellerId?: string;
      sellerContactName?: string;
      sellerName?: string;
    }

    // Combine and format response
    const allAssets = [...evalAssets, ...cartAssets, ...purchasedAssets].map(asset => {
      const purchasedData = asset as any as PurchasedAssetData;
      
      return {
        id: asset.id,
        sessionId: asset.sessionId,
        assetId: asset.assetId,
        status: asset.status as 'evaluating' | 'ready' | 'purchased' | 'passed',
        offerPrice: asset.offerPrice ? parseFloat(String(asset.offerPrice)) : undefined,
        notes: asset.notes,
        addedAt: asset.addedAt ? asset.addedAt.toISOString() : new Date().toISOString(),
        updatedAt: asset.updatedAt?.toISOString(),
        // Purchased-only fields if available
        purchaseDate: purchasedData.purchaseDate?.toISOString(),
        paymentMethod: purchasedData.paymentMethod,
        realizedProfit: purchasedData.realizedProfit ? parseFloat(String(purchasedData.realizedProfit)) : undefined,
        seller: (purchasedData.sellerContactId || purchasedData.sellerId) ? {
          id: purchasedData.sellerContactId ?? null,
          sellerId: purchasedData.sellerId ?? null,
          name: purchasedData.sellerContactName || purchasedData.sellerName || undefined,
        } : undefined,
        asset: {
          id: asset.assetId,
          title: asset.assetTitle,
          playerName: asset.assetPlayerName,
          setName: asset.assetSetName,
          year: asset.assetYear,
          cardNumber: asset.assetCardNumber,
          variant: asset.assetVariant,
          grader: asset.assetGrader,
          grade: asset.assetGrade,
          certNumber: asset.assetCertNumber,
          psaImageFrontUrl: asset.assetPsaImageFrontUrl,
          psaImageBackUrl: asset.assetPsaImageBackUrl,
        }
      };
    });

    res.json(allAssets);
  } catch (error) {
    console.error("Error fetching session assets:", error);
    res.status(500).json({ error: "Failed to fetch session assets" });
  }
});

// POST /sessions/:id/assets - Add asset to session  
router.post("/sessions/:id/assets", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const validatedData = addAssetSchema.parse(req.body);

    // Verify session ownership
    const session = await db
      .select({ id: buyOffers.id })
      .from(buyOffers)
      .where(and(
        eq(buyOffers.id, sessionId),
        eq(buyOffers.userId, userId)
      ));

    if (!session.length) {
      return res.status(404).json({ error: "Session not found" });
    }

    let assetId = validatedData.assetId;

    // If cert number provided, find the asset
    if (!assetId && validatedData.certNumber) {
      const asset = await db
        .select({ id: globalAssets.id })
        .from(globalAssets)
        .where(eq(globalAssets.certNumber, validatedData.certNumber))
        .limit(1);

      if (!asset.length) {
        return res.status(404).json({ error: "Asset not found with provided cert number" });
      }
      assetId = asset[0].id;
    }

    if (!assetId) {
      return res.status(400).json({ error: "Asset ID is required" });
    }

    // Check for duplicates in both evaluation and cart
    const existingInEvaluation = await db
      .select({ id: evaluationAssets.id })
      .from(evaluationAssets)
      .where(and(
        eq(evaluationAssets.buyOfferId, sessionId),
        eq(evaluationAssets.assetId, assetId)
      ))
      .limit(1);

    const existingInCart = await db
      .select({ id: buyListCart.id })
      .from(buyListCart)
      .where(and(
        eq(buyListCart.buyOfferId, sessionId),
        eq(buyListCart.assetId, assetId)
      ))
      .limit(1);

    if (existingInEvaluation.length > 0 || existingInCart.length > 0) {
      return res.status(409).json({ error: "Asset is already added to this session" });
    }

    // Add to evaluation assets (starting status)
    const evalAssetId = uuidv4();
    await db.insert(evaluationAssets).values({
      id: evalAssetId,
      buyOfferId: sessionId,
      assetId: assetId,
      evaluationNotes: null,
      addedAt: new Date(),
    });

    // Return the created asset with details
    const createdAsset = await db
      .select({
        id: evaluationAssets.id,
        sessionId: evaluationAssets.buyOfferId,
        assetId: evaluationAssets.assetId,
        status: sql<string>`'evaluating'`,
        notes: evaluationAssets.evaluationNotes,
        addedAt: evaluationAssets.addedAt,
        // Asset details
        assetTitle: globalAssets.title,
        assetPlayerName: globalAssets.playerName,
        assetSetName: globalAssets.setName,
        assetYear: globalAssets.year,
        assetCardNumber: globalAssets.cardNumber,
        assetGrader: globalAssets.grader,
        assetGrade: globalAssets.grade,
        assetCertNumber: globalAssets.certNumber,
      })
      .from(evaluationAssets)
      .leftJoin(globalAssets, eq(evaluationAssets.assetId, globalAssets.id))
      .where(eq(evaluationAssets.id, evalAssetId))
      .limit(1);

    const asset = createdAsset[0];

    // Ensure pricing data gets fetched soon after adding to a session
    if (asset.assetId) {
      scheduleSalesRefresh(asset.assetId, { delayMs: 500, useAIFiltering: true }).catch(() => {});
    }
    res.status(201).json({
      id: asset.id,
      sessionId: asset.sessionId,
      assetId: asset.assetId,
      status: 'evaluating' as const,
      notes: asset.notes,
      addedAt: asset.addedAt ? asset.addedAt.toISOString() : new Date().toISOString(),
      asset: {
        id: asset.assetId,
        title: asset.assetTitle,
        playerName: asset.assetPlayerName,
        setName: asset.assetSetName,
        year: asset.assetYear,
        cardNumber: asset.assetCardNumber,
        grader: asset.assetGrader,
        grade: asset.assetGrade,
        certNumber: asset.assetCertNumber,
      }
    });
  } catch (error) {
    console.error("Error adding asset to session:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to add asset to session" });
  }
});

// PATCH /sessions/:id/assets/:assetId - Update asset in session
router.patch("/sessions/:id/assets/:assetId", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const assetId = req.params.assetId;
    const validatedData = updateAssetSchema.parse(req.body);

    // Verify session ownership
    const session = await db
      .select({ id: buyOffers.id })
      .from(buyOffers)
      .where(and(
        eq(buyOffers.id, sessionId),
        eq(buyOffers.userId, userId)
      ));

    if (!session.length) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Try to update in buyListCart first (ready/purchased assets)
    const cartUpdateData: any = {};
    if (validatedData.offerPrice !== undefined) {
      cartUpdateData.offerPrice = validatedData.offerPrice.toString();
    }
    if (validatedData.notes !== undefined) {
      cartUpdateData.notes = validatedData.notes;
    }
    
    let cartUpdate: any[] = [];
    if (Object.keys(cartUpdateData).length > 0) {
      cartUpdate = await db
        .update(buyListCart)
        .set(cartUpdateData)
        .where(and(
          eq(buyListCart.buyOfferId, sessionId),
          eq(buyListCart.id, assetId)
        ))
        .returning({ id: buyListCart.id });
    }

    if (cartUpdate.length) {
      // Asset was in cart, return updated data
      const updated = await db
        .select({
          id: buyListCart.id,
          sessionId: buyListCart.buyOfferId,
          assetId: buyListCart.assetId,
          status: sql<string>`'ready'`,
          offerPrice: buyListCart.offerPrice,
          notes: buyListCart.notes,
          addedAt: buyListCart.addedAt,
        })
        .from(buyListCart)
        .where(eq(buyListCart.id, assetId))
        .limit(1);

      return res.json({
        ...updated[0],
        status: 'ready' as const,
        offerPrice: updated[0].offerPrice ? parseFloat(String(updated[0].offerPrice)) : undefined,
        addedAt: updated[0].addedAt ? updated[0].addedAt.toISOString() : new Date().toISOString(),
      });
    }

    // Try to update in evaluationAssets (evaluating assets)
    let evalUpdate: any[] = [];
    if (validatedData.notes !== undefined) {
      evalUpdate = await db
        .update(evaluationAssets)
        .set({
          evaluationNotes: validatedData.notes,
        })
        .where(and(
          eq(evaluationAssets.buyOfferId, sessionId),
          eq(evaluationAssets.id, assetId)
        ))
        .returning({ id: evaluationAssets.id });
    }

    if (evalUpdate.length) {
      // Asset was in evaluation, return updated data
      const updated = await db
        .select({
          id: evaluationAssets.id,
          sessionId: evaluationAssets.buyOfferId,
          assetId: evaluationAssets.assetId,
          status: sql<string>`'evaluating'`,
          notes: evaluationAssets.evaluationNotes,
          addedAt: evaluationAssets.addedAt,
        })
        .from(evaluationAssets)
        .where(eq(evaluationAssets.id, assetId))
        .limit(1);

      return res.json({
        ...updated[0],
        status: 'evaluating' as const,
        addedAt: updated[0].addedAt ? updated[0].addedAt.toISOString() : new Date().toISOString(),
      });
    }

    return res.status(404).json({ error: "Asset not found in session" });
  } catch (error) {
    console.error("Error updating session asset:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update session asset" });
  }
});

// DELETE /sessions/:id/assets/:assetId - Remove asset from session
router.delete("/sessions/:id/assets/:assetId", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const assetId = req.params.assetId;

    // Verify session ownership
    const session = await db
      .select({ id: buyOffers.id })
      .from(buyOffers)
      .where(and(
        eq(buyOffers.id, sessionId),
        eq(buyOffers.userId, userId)
      ));

    if (!session.length) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Try to delete from buyListCart first
    const cartDelete = await db
      .delete(buyListCart)
      .where(and(
        eq(buyListCart.buyOfferId, sessionId),
        eq(buyListCart.id, assetId)
      ))
      .returning({ id: buyListCart.id });

    if (cartDelete.length) {
      return res.status(204).send();
    }

    // Try to delete from evaluationAssets
    const evalDelete = await db
      .delete(evaluationAssets)
      .where(and(
        eq(evaluationAssets.buyOfferId, sessionId),
        eq(evaluationAssets.id, assetId)
      ))
      .returning({ id: evaluationAssets.id });

    if (evalDelete.length) {
      return res.status(204).send();
    }

    return res.status(404).json({ error: "Asset not found in session" });
  } catch (error) {
    console.error("Error removing asset from session:", error);
    res.status(500).json({ error: "Failed to remove asset from session" });
  }
});

// POST /sessions/:id/cart/move - Move evaluation asset to cart with offer price
router.post("/sessions/:id/cart/move", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const body = moveToCartSchema.parse(req.body);

    // Verify session ownership
    const session = await db
      .select({ id: buyOffers.id })
      .from(buyOffers)
      .where(and(eq(buyOffers.id, sessionId), eq(buyOffers.userId, userId)));
    if (!session.length) return res.status(404).json({ error: "Session not found" });

    // Find evaluation asset under this session
    const evalRow = await db
      .select({ id: evaluationAssets.id, assetId: evaluationAssets.assetId })
      .from(evaluationAssets)
      .where(and(eq(evaluationAssets.id, body.evaluationId), eq(evaluationAssets.buyOfferId, sessionId)))
      .limit(1);
    
    // If evaluation not found, check if this was a duplicate click and the item is already in cart.
    // We can't derive assetId without the evaluation row, so as a best-effort idempotency, return 200 when already moved.
    if (!evalRow.length) {
      return res.status(200).json({
        // Minimal OK response indicating no further action required
        message: "Already moved to cart or evaluation not found",
      });
    }

    const assetId = evalRow[0].assetId;

    // Idempotency: if a cart item for this asset/session already exists, update price and return it
    const existingCart = await db
      .select({ id: buyListCart.id, marketValueAtOffer: buyListCart.marketValueAtOffer })
      .from(buyListCart)
      .where(and(eq(buyListCart.buyOfferId, sessionId), eq(buyListCart.assetId, assetId)))
      .limit(1);
    if (existingCart.length) {
      // Recalculate expected profit for the updated offer price
      const currentMarketValue = parseFloat(String(existingCart[0].marketValueAtOffer)) || 0;
      const newExpectedProfit = currentMarketValue - body.offerPrice;
      
      await db
        .update(buyListCart)
        .set({ 
          offerPrice: body.offerPrice.toString(), 
          notes: body.notes ?? null,
          expectedProfit: newExpectedProfit.toString()
        })
        .where(eq(buyListCart.id, existingCart[0].id));

      const updated = await db
        .select({
          id: buyListCart.id,
          sessionId: buyListCart.buyOfferId,
          assetId: buyListCart.assetId,
          status: sql<string>`'ready'`,
          offerPrice: buyListCart.offerPrice,
          notes: buyListCart.notes,
          addedAt: buyListCart.addedAt,
          assetTitle: globalAssets.title,
          assetPlayerName: globalAssets.playerName,
          assetSetName: globalAssets.setName,
          assetYear: globalAssets.year,
          assetCardNumber: globalAssets.cardNumber,
          assetVariant: globalAssets.variant,
          assetGrader: globalAssets.grader,
          assetGrade: globalAssets.grade,
          assetCertNumber: globalAssets.certNumber,
          assetPsaImageFrontUrl: globalAssets.psaImageFrontUrl,
          assetPsaImageBackUrl: globalAssets.psaImageBackUrl,
        })
        .from(buyListCart)
        .leftJoin(globalAssets, eq(buyListCart.assetId, globalAssets.id))
        .where(eq(buyListCart.id, existingCart[0].id))
        .limit(1);

      const row = updated[0];
      return res.status(200).json({
        id: row.id,
        sessionId: row.sessionId,
        assetId: row.assetId,
        status: 'ready' as const,
        offerPrice: row.offerPrice ? parseFloat(String(row.offerPrice)) : undefined,
        notes: row.notes,
        addedAt: row.addedAt ? row.addedAt.toISOString() : new Date().toISOString(),
        asset: {
          id: row.assetId,
          title: row.assetTitle,
          playerName: row.assetPlayerName,
          setName: row.assetSetName,
          year: row.assetYear,
          cardNumber: row.assetCardNumber,
          variant: row.assetVariant,
          grader: row.assetGrader,
          grade: row.assetGrade,
          certNumber: row.assetCertNumber,
          psaImageFrontUrl: row.assetPsaImageFrontUrl,
          psaImageBackUrl: row.assetPsaImageBackUrl,
        },
      });
    }

    // Calculate expected profit by getting market value
    let marketValue = 0;
    let expectedProfit = 0;
    try {
      // Get the asset details to find the correct cardId for pricing lookup
      const asset = await db
        .select({ cardId: globalAssets.cardId })
        .from(globalAssets)
        .where(eq(globalAssets.id, assetId))
        .limit(1);
      
      if (asset.length > 0 && asset[0].cardId) {
        // Import and use the existing pricing controller with correct cardId
        const { calculatePricing } = await import('../helpers/controllers/pricingController');
        
        // Create mock request/response to get pricing data
        const mockReq = { params: { cardId: asset[0].cardId } };
        let pricingData: any = null;
        
        const mockRes = {
          json: (data: any) => { pricingData = data; },
          status: (code: number) => ({ json: (data: any) => { pricingData = { ...data, statusCode: code }; } })
        };
        
        await calculatePricing(mockReq as any, mockRes as any);
        
        if (pricingData && !pricingData.statusCode && pricingData.averagePrice) {
          marketValue = parseFloat(String(pricingData.averagePrice)) || 0;
          expectedProfit = marketValue - body.offerPrice;
        }
      }
    } catch (pricingError) {
      console.warn("Failed to calculate expected profit, storing 0:", pricingError);
    }

    // Insert into cart
    const cartId = uuidv4();
    await db.insert(buyListCart).values({
      id: cartId,
      buyOfferId: sessionId,
      assetId,
      offerPrice: body.offerPrice.toString(),
      notes: body.notes ?? null,
      addedAt: new Date(),
      marketValueAtOffer: marketValue.toString(),
      expectedProfit: expectedProfit.toString(),
    });

    // Remove from evaluation (idempotent if already removed)
    await db
      .delete(evaluationAssets)
      .where(and(eq(evaluationAssets.id, body.evaluationId), eq(evaluationAssets.buyOfferId, sessionId)));

    // Return created cart item
    const created = await db
      .select({
        id: buyListCart.id,
        sessionId: buyListCart.buyOfferId,
        assetId: buyListCart.assetId,
        status: sql<string>`'ready'`,
        offerPrice: buyListCart.offerPrice,
        notes: buyListCart.notes,
        addedAt: buyListCart.addedAt,
        assetTitle: globalAssets.title,
        assetPlayerName: globalAssets.playerName,
        assetSetName: globalAssets.setName,
        assetYear: globalAssets.year,
        assetCardNumber: globalAssets.cardNumber,
        assetVariant: globalAssets.variant,
        assetGrader: globalAssets.grader,
        assetGrade: globalAssets.grade,
        assetCertNumber: globalAssets.certNumber,
        assetPsaImageFrontUrl: globalAssets.psaImageFrontUrl,
        assetPsaImageBackUrl: globalAssets.psaImageBackUrl,
      })
      .from(buyListCart)
      .leftJoin(globalAssets, eq(buyListCart.assetId, globalAssets.id))
      .where(eq(buyListCart.id, cartId))
      .limit(1);

    const row = created[0];
    return res.status(201).json({
      id: row.id,
      sessionId: row.sessionId,
      assetId: row.assetId,
      status: 'ready' as const,
      offerPrice: row.offerPrice ? parseFloat(String(row.offerPrice)) : undefined,
      notes: row.notes,
      addedAt: row.addedAt ? row.addedAt.toISOString() : new Date().toISOString(),
      asset: {
        id: row.assetId,
        title: row.assetTitle,
        playerName: row.assetPlayerName,
        setName: row.assetSetName,
        year: row.assetYear,
        cardNumber: row.assetCardNumber,
        variant: row.assetVariant,
        grader: row.assetGrader,
        grade: row.assetGrade,
        certNumber: row.assetCertNumber,
        psaImageFrontUrl: row.assetPsaImageFrontUrl,
        psaImageBackUrl: row.assetPsaImageBackUrl,
      },
    });
  } catch (error) {
    console.error("Error moving asset to cart:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid input", details: error.errors });
    }
    res.status(500).json({ error: "Failed to move asset to cart" });
  }
});

// DELETE /sessions/:id/cart/:cartId - Remove asset from cart (back to evaluation)
router.delete("/sessions/:id/cart/:cartId", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const sessionId = req.params.id;
    const cartId = req.params.cartId;

    // Verify session ownership
    const session = await db
      .select({ id: buyOffers.id })
      .from(buyOffers)
      .where(and(eq(buyOffers.id, sessionId), eq(buyOffers.userId, userId)));
    if (!session.length) return res.status(404).json({ error: "Session not found" });

    // Try to find cart row normally
    let cartRow = await db
      .select({ id: buyListCart.id, assetId: buyListCart.assetId })
      .from(buyListCart)
      .where(and(eq(buyListCart.id, cartId), eq(buyListCart.buyOfferId, sessionId)))
      .limit(1);

    let assetId: string | null = null;

    if (cartRow.length) {
      assetId = cartRow[0].assetId as string;
    } else {
      // Tolerance for rapid clicks: if cartId is actually an evaluationId, resolve its assetId
      const evalRow = await db
        .select({ id: evaluationAssets.id, assetId: evaluationAssets.assetId })
        .from(evaluationAssets)
        .where(and(eq(evaluationAssets.id, cartId), eq(evaluationAssets.buyOfferId, sessionId)))
        .limit(1);

      if (evalRow.length) {
        assetId = evalRow[0].assetId as string;
        // With assetId resolved, try to find the corresponding cart item for this asset
        cartRow = await db
          .select({ id: buyListCart.id, assetId: buyListCart.assetId })
          .from(buyListCart)
          .where(and(eq(buyListCart.buyOfferId, sessionId), eq(buyListCart.assetId, assetId)))
          .limit(1);
      }
    }

    // If we still couldn't resolve a cart row, treat as idempotent success
    if (!cartRow.length) {
      return res.status(204).send();
    }

    // Delete from cart
    await db
      .delete(buyListCart)
      .where(and(eq(buyListCart.id, cartRow[0].id), eq(buyListCart.buyOfferId, sessionId)));

    // Recreate in evaluation list if not already present
    if (assetId) {
      const existsInEval = await db
        .select({ id: evaluationAssets.id })
        .from(evaluationAssets)
        .where(and(eq(evaluationAssets.buyOfferId, sessionId), eq(evaluationAssets.assetId, assetId)))
        .limit(1);
      if (!existsInEval.length) {
        await db.insert(evaluationAssets).values({
          id: uuidv4(),
          buyOfferId: sessionId,
          assetId,
          evaluationNotes: null,
          addedAt: new Date(),
        });
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({ error: "Failed to remove cart item" });
  }
});

// DELETE /sessions/:sessionId/revert/:assetId - Revert purchased item back to buy list
router.delete("/sessions/:sessionId/revert/:assetId", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const { sessionId, assetId } = req.params;

    // Verify session ownership
    const session = await db
      .select({ id: buyOffers.id })
      .from(buyOffers)
      .where(and(
        eq(buyOffers.id, sessionId),
        eq(buyOffers.userId, userId)
      ));

    if (!session.length) {
      return res.status(404).json({ error: "Session not found" });
    }

    // Find the user asset (purchased item)
    const userAsset = await db
      .select()
      .from(userAssets)
      .where(and(
        eq(userAssets.globalAssetId, assetId),
        eq(userAssets.userId, userId)
      ));

    if (!userAsset.length) {
      return res.status(404).json({ error: "User asset not found" });
    }

    // Delete the purchase transaction
    await db
      .delete(purchaseTransactions)
      .where(and(
        eq(purchaseTransactions.globalAssetId, assetId),
        eq(purchaseTransactions.userId, userId)
      ));

    // Delete the user asset
    await db
      .delete(userAssets)
      .where(and(
        eq(userAssets.globalAssetId, assetId),
        eq(userAssets.userId, userId)
      ));

    // Add back to buy list cart for this session
    await db
      .insert(buyListCart)
      .values({
        id: uuidv4(),
        buyOfferId: sessionId,
        assetId,
        offerPrice: "0", // Will be updated by user
        notes: "Reverted from purchase"
      });

    // Reset session status so it can be used for checkout again
    await db
      .update(buyOffers)
      .set({ 
        status: 'in_progress',
        sentAt: null,
        updatedAt: new Date()
      })
      .where(eq(buyOffers.id, sessionId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error reverting purchase:", error);
    res.status(500).json({ error: "Failed to revert purchase" });
  }
});

export default router;