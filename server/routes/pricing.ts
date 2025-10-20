// PRICING ENDPOINT 🎯 
// Gets the average price for any card - boom, done, simple as that
// Returns current market value based on recent sales data
// Now proxies to unified market endpoint for consistency
// 100% ready for production use

import { Router } from 'express';
import { z } from 'zod';
import { calculateMarketSnapshot, calculateMarketSnapshotsBatch, MarketSnapshot } from './market';

// Backward compatibility interface for pricing endpoints
interface PricingData {
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  confidence: number;
  lastSaleDate: string | null;
  salesCount: number;
  exitTime: string;
  pricingPeriod: string;
  thirtyDaySalesCount: number;
}

// Transform MarketSnapshot to legacy pricing format for backward compatibility
function transformMarketSnapshotToPricing(snapshot: MarketSnapshot): PricingData {
  const { id, salesHistory, ...pricingData } = snapshot;
  return pricingData;
}

const router = Router();

/**
 * @swagger
 * /pricing/{assetId}:
 *   get:
 *     tags: [Pricing]
 *     summary: Get real-time pricing data for any card
 *     description: Calculate pricing metrics including average, high, low prices and liquidity rating
 *     parameters:
 *       - in: path
 *         name: assetId
 *         required: true
 *         schema:
 *           type: string
 *         description: Card ID
 *     responses:
 *       200:
 *         description: Pricing data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 averagePrice:
 *                   type: number
 *                   format: float
 *                 liquidity:
 *                   type: string
 *                   enum: [fire, hot, warm, cool, cold]
 *                 confidence:
 *                   type: string
 *                   enum: [high, medium, low]
 *                 salesCount:
 *                   type: integer
 *                 lastSaleDate:
 *                   type: string
 *       404:
 *         description: Card not found
 */

// Single pricing endpoint - now proxies to unified market endpoint
router.get('/:cardId', async (req, res) => {
  const { cardId } = req.params;
  const start = Date.now();
  try {
    const marketSnapshot = await calculateMarketSnapshot(cardId, false);
    if (!marketSnapshot) {
      return res.status(404).json({ error: 'Card not found' });
    }
    const pricingData = transformMarketSnapshotToPricing(marketSnapshot);
    console.log(`[pricing/single] processed=${cardId} durationMs=${Date.now() - start}`);
    res.json(pricingData);
  } catch (error) {
    console.error('Error in single pricing endpoint:', error);
    res.status(500).json({ error: 'Failed to calculate pricing' });
  }
});

// Batch pricing endpoint - now proxies to unified market endpoint
router.post('/batch', async (req, res) => {
  const start = Date.now();
  try {
    const bodySchema = z.object({
      globalAssetIds: z.array(z.string().min(1)).min(1),
    });
    const { globalAssetIds } = bodySchema.parse(req.body);

    const marketSnapshots = await calculateMarketSnapshotsBatch(globalAssetIds, false);
    const results: { [key: string]: PricingData | null } = {};
    for (const [assetId, snapshot] of Object.entries(marketSnapshots)) {
      results[assetId] = snapshot ? transformMarketSnapshotToPricing(snapshot) : null;
    }
    const duration = Date.now() - start;
    console.log(`[pricing/batch] processed=${globalAssetIds.length} durationMs=${duration}`);
    res.json(results);
  } catch (error) {
    console.error('Error in batch pricing:', error);
    res.status(500).json({ error: 'Failed to calculate batch pricing' });
  }
});

export default router;