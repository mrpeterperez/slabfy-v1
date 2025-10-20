// SALES DATA ENDPOINT 📊
// Gets existing sales from our database - NO eBay calls, just pure cached speed
// Returns 100+ sales records instantly from our local database
// Zero external API calls = lightning fast response

import { Router } from 'express';
import { getSalesComparison } from './helpers/controllers/salesController';
import { db } from '../db';
import { userAssets, userSalesLog } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { authenticateUser } from '../supabase';

const router = Router();

/**
 * @swagger
 * /sales-comp-universal/{userAssetId}:
 *   get:
 *     tags: [Sales Comparison]
 *     summary: Get authentic marketplace sales data with intelligent caching
 *     description: |
 *       Returns authentic eBay sales records from internal database cache.
 *       Uses PRICING_API_KEY integration with Countdown marketplace API.
 *       - Serves cached authentic marketplace data instantly
 *       - Includes real seller names, feedback scores, and images
 *       - Links user assets to global sales data for consistency
 *       - Zero external API calls for cached data
 *     parameters:
 *       - in: path
 *         name: userAssetId
 *         required: true
 *         schema:
 *           type: string
 *         description: User asset ID
 *         example: "af6ab6dd-e368-4df0-b7c1-3b69a5ba7378"
 *     responses:
 *       200:
 *         description: Authentic sales comparison data retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sales:
 *                   type: array
 *                   description: Array of authentic marketplace sales
 *                   items:
 *                     type: object
 *                     properties:
 *                       title:
 *                         type: string
 *                         example: "2024-25 Bowman University Now Cooper Flagg #44 PSA 10 Gem Mint Rookie Card"
 *                       finalPrice:
 *                         type: string
 *                         example: "158.50"
 *                       shipping:
 *                         type: string
 *                         example: "4.95"
 *                       sellerName:
 *                         type: string
 *                         example: "sports_cards_pro"
 *                       sellerFeedback:
 *                         type: string
 *                         example: "1284"
 *                       listingUrl:
 *                         type: string
 *                         example: "https://www.ebay.com/itm/12345678901"
 *                       imageUrl:
 *                         type: string
 *                         example: "https://i.ebayimg.com/images/g/abc123def456/s-l1600.jpg"
 *                 globalAssetId:
 *                   type: string
 *                   example: "d0f56894-55f3-4fc8-ba67-308da0c0e5bb"
 *                 salesCount:
 *                   type: integer
 *                   example: 6
 *       404:
 *         description: Asset not found
 */

// Use the modular sales controller
router.get('/sales-comp-universal/:userAssetId', getSalesComparison);

/**
 * @swagger
 * /api/sales/manual:
 *   post:
 *     tags: [Sales]
 *     summary: Record manual sale when user deletes asset from portfolio
 *     description: |
 *       Creates manual sale record in user_sales_log (private analytics only) and soft deletes user_asset.
 *       Used when user sells asset outside platform (In Person/eBay/Other).
 *       These sales are PRIVATE - analytics only, never affects public pricing/chart.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userAssetId
 *               - salePrice
 *               - saleDate
 *               - platform
 *             properties:
 *               userAssetId:
 *                 type: string
 *                 description: User asset ID being sold
 *                 example: "af6ab6dd-e368-4df0-b7c1-3b69a5ba7378"
 *               salePrice:
 *                 type: number
 *                 description: Final sale price in dollars
 *                 example: 85.50
 *               saleDate:
 *                 type: string
 *                 format: date
 *                 description: Date of sale (YYYY-MM-DD)
 *                 example: "2025-07-15"
 *               platform:
 *                 type: string
 *                 enum: [ebay, cash, check, digital, trade, other]
 *                 description: Where card was sold
 *                 example: "ebay"
 *               notes:
 *                 type: string
 *                 description: Optional sale notes
 *     responses:
 *       201:
 *         description: Manual sale recorded and asset deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 saleId:
 *                   type: string
 *                   example: "sale_12345"
 *                 message:
 *                   type: string
 *                   example: "Sale recorded in analytics and asset removed from portfolio"
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Asset not found
 */
router.post('/manual', authenticateUser, async (req: any, res: any) => {
  try {
    const { userAssetId, salePrice, saleDate, platform, notes } = req.body;
    const authenticatedUserId = req.user?.id;

    console.log('🧪 Manual sale request received', {
      userId: authenticatedUserId,
      userAssetId,
      salePrice,
      saleDate,
      platform,
      hasNotes: Boolean(notes),
    });

    // Auth check
    if (!authenticatedUserId) {
      console.warn('⚠️ Manual sale blocked: unauthenticated request', {
        userAssetId,
        salePrice,
        saleDate,
        platform,
      });
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Validation
    if (!userAssetId || !salePrice || !saleDate || !platform) {
      console.warn('⚠️ Manual sale validation failed: missing required fields', {
        userAssetId,
        salePrice,
        saleDate,
        platform,
      });
      return res.status(400).json({ error: 'Missing required fields: userAssetId, salePrice, saleDate, platform' });
    }

    if (salePrice <= 0) {
      console.warn('⚠️ Manual sale validation failed: sale price must be > 0', {
        userAssetId,
        salePrice,
        userId: authenticatedUserId,
      });
      return res.status(400).json({ error: 'Sale price must be greater than 0' });
    }

    const validPlatforms = ['ebay', 'in_person', 'cash', 'check', 'digital', 'trade', 'other'];
    if (!validPlatforms.includes(platform)) {
      console.warn('⚠️ Manual sale validation failed: invalid platform provided', {
        userAssetId,
        salePrice,
        platform,
        userId: authenticatedUserId,
      });
      return res.status(400).json({ 
        error: `Platform must be one of: ${validPlatforms.join(', ')}` 
      });
    }

    // Verify ownership and get purchase context
    const [userAsset] = await db
      .select({
        id: userAssets.id,
        globalAssetId: userAssets.globalAssetId,
        purchasePrice: userAssets.purchasePrice,
        purchaseDate: userAssets.purchaseDate,
        purchaseSource: userAssets.purchaseSource,
      })
      .from(userAssets)
      .where(and(eq(userAssets.id, userAssetId), eq(userAssets.userId, authenticatedUserId)));

    if (!userAsset) {
      console.warn('⚠️ Manual sale failed: asset not found or not owned by user', {
        userAssetId,
        userId: authenticatedUserId,
      });
      return res.status(404).json({ error: 'Asset not found or you do not own this asset' });
    }

    console.log('📦 Manual sale asset context loaded', {
      userAssetId,
      globalAssetId: userAsset.globalAssetId,
      purchasePrice: userAsset.purchasePrice,
      purchaseDate: userAsset.purchaseDate,
      purchaseSource: userAsset.purchaseSource,
    });

    // Calculate profit and ROI
    const salePriceNum = parseFloat(salePrice);
    const purchasePriceNum = userAsset.purchasePrice ? parseFloat(userAsset.purchasePrice) : null;
    const profit = purchasePriceNum !== null ? salePriceNum - purchasePriceNum : null;
    const roi = purchasePriceNum !== null && purchasePriceNum > 0
      ? ((salePriceNum - purchasePriceNum) / purchasePriceNum) * 100
      : null;

    console.log('📈 Manual sale profit calculation', {
      userAssetId,
      salePriceNum,
      purchasePriceNum,
      profit,
      roi,
    });

    // Create user sales log record (private analytics only)
    const saleId = nanoid();
    await db.insert(userSalesLog).values({
      id: saleId,
      userId: authenticatedUserId,
      globalAssetId: userAsset.globalAssetId,
      salePrice: salePrice.toString(),
      saleDate: new Date(saleDate),
      platform,
      purchasePrice: userAsset.purchasePrice || null,
      purchaseDate: userAsset.purchaseDate || null,
      purchaseSource: userAsset.purchaseSource || null,
      profit: profit !== null ? profit.toString() : null,
      roi: roi !== null ? roi.toString() : null,
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Soft delete user asset and mark as sold (prevents auto-recovery on re-add)
    await db
      .update(userAssets)
      .set({
        isActive: false,
        soldAt: new Date(saleDate), // Mark when sold
        soldPrice: salePrice.toString(), // Record sale price
        removedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(userAssets.id, userAssetId), eq(userAssets.userId, authenticatedUserId)));

      console.log('✅ Manual sale recorded in analytics', {
        saleId,
        userAssetId,
        userId: authenticatedUserId,
        profit: profit !== null ? Number(profit.toFixed(2)) : null,
        roi: roi !== null ? Number(roi.toFixed(2)) : null,
      });

    return res.status(201).json({
      success: true,
      saleId,
      message: 'Sale recorded in analytics and asset removed from portfolio',
      profit: profit !== null ? parseFloat(profit.toFixed(2)) : null,
      roi: roi !== null ? parseFloat(roi.toFixed(2)) : null,
    });
  } catch (error) {
      console.error('❌ Error recording manual sale', {
        userId: req.user?.id,
        userAssetId: req.body?.userAssetId,
        error,
      });
    return res.status(500).json({ error: 'Failed to record manual sale' });
  }
});

export default router;