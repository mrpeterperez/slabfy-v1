// CARD SEARCH 🔍
// Finds globalAssetId by card details (player, year, set, number, grade)
// Used for pricing lookup before card is added to portfolio

import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { globalAssets } from '../../shared/schema';
import { and, eq, ilike, or, sql } from 'drizzle-orm';

const router = Router();

const searchSchema = z.object({
  playerName: z.string().optional(),
  year: z.string().optional(),
  setName: z.string().optional(),
  cardNumber: z.string().optional(),
  grade: z.string().optional(),
  variant: z.string().optional(),
});

/**
 * @swagger
 * /card-search:
 *   post:
 *     tags: [Cards]
 *     summary: Search for globalAssetId by card details
 *     description: Finds matching globalAsset to lookup pricing before adding to portfolio
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerName:
 *                 type: string
 *               year:
 *                 type: string
 *               setName:
 *                 type: string
 *               cardNumber:
 *                 type: string
 *               grade:
 *                 type: string
 *               variant:
 *                 type: string
 *     responses:
 *       200:
 *         description: Card found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 globalAssetId:
 *                   type: string
 *                 cardId:
 *                   type: string
 *                 title:
 *                   type: string
 *       404:
 *         description: No matching card found
 */
router.post('/', async (req, res) => {
  try {
    const params = searchSchema.parse(req.body);
    
    // Build WHERE conditions - all fields must match if provided
    const conditions = [];
    
    if (params.playerName) {
      conditions.push(ilike(globalAssets.playerName, params.playerName));
    }
    
    if (params.year) {
      conditions.push(eq(globalAssets.year, params.year));
    }
    
    if (params.setName) {
      // Case-insensitive partial match for set name (handles variations)
      conditions.push(ilike(globalAssets.setName, `%${params.setName}%`));
    }
    
    if (params.cardNumber) {
      conditions.push(eq(globalAssets.cardNumber, params.cardNumber));
    }
    
    if (params.grade) {
      conditions.push(eq(globalAssets.grade, params.grade));
    }
    
    if (params.variant) {
      conditions.push(ilike(globalAssets.variant, `%${params.variant}%`));
    }
    
    // If no conditions provided, return error
    if (conditions.length === 0) {
      return res.status(400).json({ 
        error: 'At least one search parameter required' 
      });
    }
    
    // Search for matching card
    const results = await db
      .select({
        id: globalAssets.id,
        cardId: globalAssets.cardId,
        title: globalAssets.title,
        playerName: globalAssets.playerName,
        year: globalAssets.year,
        setName: globalAssets.setName,
        cardNumber: globalAssets.cardNumber,
        grade: globalAssets.grade,
        variant: globalAssets.variant,
      })
      .from(globalAssets)
      .where(and(...conditions))
      .limit(1);
    
    if (results.length === 0) {
      console.log(`[card-search] No match found for:`, params);
      return res.status(404).json({ 
        error: 'No matching card found',
        searchParams: params 
      });
    }
    
    const card = results[0];
    console.log(`[card-search] Found match:`, {
      globalAssetId: card.id,
      title: card.title,
      searchParams: params,
    });
    
    res.json({
      globalAssetId: card.id,
      cardId: card.cardId,
      title: card.title,
      playerName: card.playerName,
      year: card.year,
      setName: card.setName,
      cardNumber: card.cardNumber,
      grade: card.grade,
      variant: card.variant,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid search parameters', 
        details: error.errors 
      });
    }
    
    console.error('Error in card search:', error);
    res.status(500).json({ error: 'Failed to search for card' });
  }
});

export default router;
