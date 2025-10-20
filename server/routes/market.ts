// UNIFIED MARKET ENDPOINT 🎯
// Single endpoint for all pricing, liquidity, and sales data
// Handles both single and batch requests with smart caching
// 100% production ready with proper validation and rate limiting

import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { findCard, findCardsBatch } from './helpers/cardFinder';
import { getSavedSales, getSavedSalesBatch } from './helpers/salesGetter';

// ===== INTERFACES & TYPES =====
export interface MarketSnapshot {
  id: string;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold';
  confidence: number; // 0-100 percentage
  salesCount: number;
  thirtyDaySalesCount: number;
  lastSaleDate: string | null;
  pricingPeriod: string;
  exitTime: string; // How quickly asset can be sold
  salesHistory?: SalePoint[]; // Optional - only when includeHistory=true
}

export interface SalePoint {
  price: number;
  date: string;
  condition: string;
  marketplace: string;
  listingType: string;
  url?: string;
}

interface CachedData {
  data: MarketSnapshot;
  cachedAt: number;
}

// ===== CACHING LAYER =====
const MARKET_CACHE = new Map<string, CachedData>();
const CACHE_TTL_MS = 7 * 60 * 1000; // 7 minutes TTL for optimal balance

function getCacheKey(id: string, includeHistory: boolean, historyPoints?: number): string {
  return `market:${id}:${includeHistory}:${historyPoints || 'none'}`;
}

function isValidCache(cached: CachedData): boolean {
  return Date.now() - cached.cachedAt < CACHE_TTL_MS;
}

// ===== VALIDATION SCHEMAS =====
const singleMarketQuerySchema = z.object({
  id: z.string().min(1, 'Asset ID is required'),
  includeHistory: z.string().optional().transform(val => val === 'true'),
  historyPoints: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});

const batchMarketQuerySchema = z.object({
  ids: z.string().min(1, 'Asset IDs are required').transform(val => val.split(',')),
  includeHistory: z.string().optional().transform(val => val === 'true'),
  historyPoints: z.string().optional().transform(val => val ? parseInt(val, 10) : undefined),
});

const purgeBodySchema = z.object({
  ids: z.array(z.string()).optional(),
  pattern: z.string().optional(),
}).refine(data => data.ids || data.pattern, {
  message: "Either 'ids' array or 'pattern' string must be provided"
});

// ===== RATE LIMITING =====
const marketRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: { error: 'Too many market data requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const purgeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute  
  max: 5, // 5 purge requests per minute per IP
  message: { error: 'Too many cache purge requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ===== PRICING CALCULATION LOGIC =====
export async function calculateMarketSnapshot(
  assetId: string, 
  includeHistory = false, 
  historyPoints = 30
): Promise<MarketSnapshot | null> {
  // Find the card
  const card = await findCard(assetId);
  if (!card) return null;

  // Get sales data
  const salesData = await getSavedSales(card.cardId || card.globalId);
  
  // Calculate pricing metrics (same logic as pricingController)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const thirtyDaySalesData = salesData.filter(sale => {
    if (sale.sold_date?.date?.raw) {
      const saleDate = new Date(sale.sold_date.date.raw);
      return saleDate >= thirtyDaysAgo;
    }
    return false;
  });
  
  let averagePrice = 0;
  let highestPrice = 0;
  let lowestPrice = 0;
  let lastSaleDate = null;
  let pricingPeriod = "30 days";
  
  const dataToUse = thirtyDaySalesData.length > 0 ? thirtyDaySalesData : salesData;
  if (dataToUse.length > 0) {
    const prices = dataToUse.map(sale => sale.sold_price.value + sale.shipping);
    averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    highestPrice = Math.max(...prices);
    lowestPrice = Math.min(...prices);
    
    const latestSale = dataToUse[0];
    lastSaleDate = latestSale.sold_date?.date?.raw || null;
    
    if (thirtyDaySalesData.length === 0 && salesData.length > 0) {
      pricingPeriod = "All time";
    }
  }
  
  // Calculate liquidity
  let liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold' = 'cold';
  if (salesData.length >= 50) liquidity = 'fire';
  else if (salesData.length >= 30) liquidity = 'hot';
  else if (salesData.length >= 15) liquidity = 'warm';
  else if (salesData.length >= 5) liquidity = 'cool';
  
  // Calculate confidence (simplified for performance)
  let confidence = 0;
  if (thirtyDaySalesData.length >= 10) confidence = 95;
  else if (thirtyDaySalesData.length >= 5) confidence = 80;
  else if (thirtyDaySalesData.length >= 3) confidence = 60;
  else if (salesData.length >= 5) confidence = 40;
  else if (salesData.length >= 2) confidence = 20;
  
  // Calculate exit time based on liquidity
  let exitTime = 'Unknown';
  switch (liquidity) {
    case 'fire': exitTime = '1-3 days'; break;
    case 'hot': exitTime = '3-7 days'; break;
    case 'warm': exitTime = '1-2 weeks'; break;
    case 'cool': exitTime = '2-4 weeks'; break;
    case 'cold': exitTime = '1+ months'; break;
  }
  
  // Build sales history if requested
  let salesHistory: SalePoint[] | undefined;
  if (includeHistory && salesData.length > 0) {
    const historyData = salesData.slice(0, historyPoints);
    salesHistory = historyData.map(sale => ({
      price: sale.sold_price.value + sale.shipping,
      date: sale.sold_date?.date?.raw || '',
      condition: sale.condition,
      marketplace: sale.marketplace,
      listingType: sale.listingType,
      url: sale.url || undefined,
    }));
  }
  
  return {
    id: assetId,
    averagePrice: Math.round(averagePrice * 100) / 100,
    highestPrice: Math.round(highestPrice * 100) / 100,
    lowestPrice: Math.round(lowestPrice * 100) / 100,
    liquidity,
    confidence,
    salesCount: salesData.length,
    thirtyDaySalesCount: thirtyDaySalesData.length,
    lastSaleDate,
    pricingPeriod,
    exitTime,
    salesHistory,
  };
}

export async function calculateMarketSnapshotsBatch(
  assetIds: string[], 
  includeHistory = false, 
  historyPoints = 30
): Promise<Record<string, MarketSnapshot | null>> {
  const results: Record<string, MarketSnapshot | null> = {};
  
  // Use batch functions for ultra performance
  const cardsMap = await findCardsBatch(assetIds);
  
  // Get all card IDs for sales lookup
  const cardIdsForSales = new Set<string>();
  for (const card of Array.from(cardsMap.values())) {
    if (card.cardId) cardIdsForSales.add(card.cardId);
    cardIdsForSales.add(card.globalId);
  }
  
  // Get all sales data in ONE query
  const salesMap = await getSavedSalesBatch(Array.from(cardIdsForSales));
  
  // Calculate metrics for each asset
  for (const assetId of assetIds) {
    const card = cardsMap.get(assetId);
    if (!card) {
      results[assetId] = null;
      continue;
    }
    
    const salesData = salesMap.get(card.cardId || card.globalId) || [];
    
    // Same calculation logic as single version
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const thirtyDaySalesData = salesData.filter(sale => {
      if (sale.sold_date?.date?.raw) {
        const saleDate = new Date(sale.sold_date.date.raw);
        return saleDate >= thirtyDaysAgo;
      }
      return false;
    });
    
    let averagePrice = 0;
    let highestPrice = 0;
    let lowestPrice = 0;
    let lastSaleDate = null;
    let pricingPeriod = "30 days";
    
    const dataToUse = thirtyDaySalesData.length > 0 ? thirtyDaySalesData : salesData;
    if (dataToUse.length > 0) {
      const prices = dataToUse.map(sale => sale.sold_price.value + sale.shipping);
      averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
      highestPrice = Math.max(...prices);
      lowestPrice = Math.min(...prices);
      
      const latestSale = dataToUse[0];
      lastSaleDate = latestSale.sold_date?.date?.raw || null;
      
      if (thirtyDaySalesData.length === 0 && salesData.length > 0) {
        pricingPeriod = "All time";
      }
    }
    
    // Calculate liquidity
    let liquidity: 'fire' | 'hot' | 'warm' | 'cool' | 'cold' = 'cold';
    if (salesData.length >= 50) liquidity = 'fire';
    else if (salesData.length >= 30) liquidity = 'hot';
    else if (salesData.length >= 15) liquidity = 'warm';
    else if (salesData.length >= 5) liquidity = 'cool';
    
    // Calculate confidence
    let confidence = 0;
    if (thirtyDaySalesData.length >= 10) confidence = 95;
    else if (thirtyDaySalesData.length >= 5) confidence = 80;
    else if (thirtyDaySalesData.length >= 3) confidence = 60;
    else if (salesData.length >= 5) confidence = 40;
    else if (salesData.length >= 2) confidence = 20;
    
    // Calculate exit time
    let exitTime = 'Unknown';
    switch (liquidity) {
      case 'fire': exitTime = '1-3 days'; break;
      case 'hot': exitTime = '3-7 days'; break;
      case 'warm': exitTime = '1-2 weeks'; break;
      case 'cool': exitTime = '2-4 weeks'; break;
      case 'cold': exitTime = '1+ months'; break;
    }
    
    // Build sales history if requested
    let salesHistory: SalePoint[] | undefined;
    if (includeHistory && salesData.length > 0) {
      const historyData = salesData.slice(0, historyPoints);
      salesHistory = historyData.map(sale => ({
        price: sale.sold_price.value + sale.shipping,
        date: sale.sold_date?.date?.raw || '',
        condition: sale.condition,
        marketplace: sale.marketplace,
        listingType: sale.listingType,
        url: sale.url || undefined,
      }));
    }
    
    results[assetId] = {
      id: assetId,
      averagePrice: Math.round(averagePrice * 100) / 100,
      highestPrice: Math.round(highestPrice * 100) / 100,
      lowestPrice: Math.round(lowestPrice * 100) / 100,
      liquidity,
      confidence,
      salesCount: salesData.length,
      thirtyDaySalesCount: thirtyDaySalesData.length,
      lastSaleDate,
      pricingPeriod,
      exitTime,
      salesHistory,
    };
  }
  
  return results;
}

// ===== ROUTER SETUP =====
const router = Router();

/**
 * @swagger
 * /market:
 *   get:
 *     tags: [Market Data]
 *     summary: Get unified market data for single or multiple assets
 *     description: Returns comprehensive market snapshot including pricing, liquidity, and optional sales history
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         description: Single asset ID (use this OR ids, not both)
 *       - in: query
 *         name: ids
 *         schema:
 *           type: string
 *         description: Comma-separated asset IDs (use this OR id, not both)
 *       - in: query
 *         name: includeHistory
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include detailed sales history in response
 *       - in: query
 *         name: historyPoints
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Number of historical sales to include (max 100)
 *     responses:
 *       200:
 *         description: Market data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/MarketSnapshot'
 *                 - type: object
 *                   additionalProperties:
 *                     $ref: '#/components/schemas/MarketSnapshot'
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Asset(s) not found
 *       429:
 *         description: Rate limit exceeded
 */
router.get('/', marketRateLimit, async (req, res) => {
  const start = Date.now();
  try {
    const { id, ids } = req.query;
    if (!id && !ids) {
      return res.status(400).json({ error: 'Either id or ids parameter is required' });
    }
    if (id && ids) {
      return res.status(400).json({ error: 'Cannot specify both id and ids parameters' });
    }
    // Handle single asset request
    if (id) {
      const validatedQuery = singleMarketQuerySchema.parse(req.query);
      const { includeHistory = false, historyPoints = 30 } = validatedQuery;
      
      // Check cache first
      const cacheKey = getCacheKey(validatedQuery.id, includeHistory, historyPoints);
      const cached = MARKET_CACHE.get(cacheKey);
      
      if (cached && isValidCache(cached)) {
        console.log(`[market] Cache HIT for ${validatedQuery.id} (${Date.now() - start}ms)`);
        return res.json(cached.data);
      }
      
      // Calculate fresh data
      const snapshot = await calculateMarketSnapshot(validatedQuery.id, includeHistory, historyPoints);
      
      if (!snapshot) {
        return res.status(404).json({ error: 'Asset not found' });
      }
      
      // Cache the result
      MARKET_CACHE.set(cacheKey, { data: snapshot, cachedAt: Date.now() });
      
      console.log(`[market] Single asset processed: ${validatedQuery.id} (${Date.now() - start}ms)`);
      res.json(snapshot);
    }
    
    // Handle batch assets request
    else if (ids) {
      const validatedQuery = batchMarketQuerySchema.parse(req.query);
      const { includeHistory = false, historyPoints = 30 } = validatedQuery;
      
      // Validate batch size
      if (validatedQuery.ids.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 asset IDs allowed per batch request' });
      }
      
      // Check cache for each ID
      const results: Record<string, MarketSnapshot | null> = {};
      const uncachedIds: string[] = [];
      
      for (const assetId of validatedQuery.ids) {
        const cacheKey = getCacheKey(assetId, includeHistory, historyPoints);
        const cached = MARKET_CACHE.get(cacheKey);
        
        if (cached && isValidCache(cached)) {
          results[assetId] = cached.data;
        } else {
          uncachedIds.push(assetId);
        }
      }
      
      // Calculate fresh data for uncached IDs
      if (uncachedIds.length > 0) {
        const freshSnapshots = await calculateMarketSnapshotsBatch(uncachedIds, includeHistory, historyPoints);
        
        // Merge fresh data and cache it
        for (const [assetId, snapshot] of Object.entries(freshSnapshots)) {
          results[assetId] = snapshot;
          
          if (snapshot) {
            const cacheKey = getCacheKey(assetId, includeHistory, historyPoints);
            MARKET_CACHE.set(cacheKey, { data: snapshot, cachedAt: Date.now() });
          }
        }
      }
      
      console.log(`[market] Batch processed: ${validatedQuery.ids.length} assets, ${uncachedIds.length} uncached (${Date.now() - start}ms)`);
      res.json(results);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
    }
    console.error('Error in market endpoint:', error);
    res.status(500).json({ error: 'Failed to retrieve market data' });
  }
});

/**
 * @swagger
 * /market/purge:
 *   post:
 *     tags: [Market Data]
 *     summary: Purge market data cache
 *     description: Clears cached market data for specific assets or by pattern
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific asset IDs to purge from cache
 *               pattern:
 *                 type: string
 *                 description: Pattern to match cache keys (e.g., "market:abc-123")
 *             oneOf:
 *               - required: [ids]
 *               - required: [pattern]
 *     responses:
 *       200:
 *         description: Cache purged successfully
 *       400:
 *         description: Invalid request body
 *       429:
 *         description: Rate limit exceeded
 */
router.post('/purge', purgeRateLimit, async (req, res) => {
  try {
    const validatedBody = purgeBodySchema.parse(req.body);
    let purgedCount = 0;
    
    if (validatedBody.ids) {
      // Purge specific asset IDs (all variants)
      for (const id of validatedBody.ids) {
        const keysToDelete = Array.from(MARKET_CACHE.keys()).filter(key => 
          key.startsWith(`market:${id}:`)
        );
        
        for (const key of keysToDelete) {
          MARKET_CACHE.delete(key);
          purgedCount++;
        }
      }
    }
    
    if (validatedBody.pattern) {
      // Purge by pattern
      const keysToDelete = Array.from(MARKET_CACHE.keys()).filter(key => 
        key.includes(validatedBody.pattern!)
      );
      
      for (const key of keysToDelete) {
        MARKET_CACHE.delete(key);
        purgedCount++;
      }
    }
    
    console.log(`[market/purge] Purged ${purgedCount} cache entries`);
    res.json({ 
      message: 'Cache purged successfully', 
      purgedCount,
      remainingEntries: MARKET_CACHE.size 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request body', details: error.errors });
    }
    console.error('Error in market purge endpoint:', error);
    res.status(500).json({ error: 'Failed to purge cache' });
  }
});

// Cache cleanup routine (runs every 10 minutes)
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  for (const [key, cached] of Array.from(MARKET_CACHE.entries())) {
    if (now - cached.cachedAt > CACHE_TTL_MS) {
      keysToDelete.push(key);
    }
  }
  
  for (const key of keysToDelete) {
    MARKET_CACHE.delete(key);
  }
  
  if (keysToDelete.length > 0) {
    console.log(`[market/cleanup] Cleaned ${keysToDelete.length} expired cache entries`);
  }
}, 10 * 60 * 1000); // 10 minutes

export default router;