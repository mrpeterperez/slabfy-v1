// REFRESH ENDPOINT ⚡
// Handles HTTP requests and calls refreshController to do the heavy lifting
// Goes to eBay, gets fresh data, saves it to database
// Working and ready - calls controller for all the real work

import { Router, Request, Response } from 'express';
import { refreshCardSales } from './helpers/controllers/refreshController';
import { authenticateUser, AuthenticatedRequest } from '../supabase';
import { z } from 'zod';

const refreshSchema = z.object({
  assetId: z.string().min(1), // could refine to uuid() if all IDs are UUID
  useAIFiltering: z.boolean().optional()
});

const router = Router();

/**
 * @swagger
 * /sales-history-refresh/refresh:
 *   post:
 *     tags: [Manual Refresh]
 *     summary: Fetch fresh marketplace data using internal Countdown API
 *     description: |
 *       Refreshes sales data using PRICING_API_KEY for authentic marketplace records.
 *       Calls Supabase edge function with Countdown API integration.
 *       - Generates optimized search queries for better marketplace matching
 *       - Implements intelligent deduplication to prevent duplicates
 *       - Saves authentic eBay data with seller info, images, and all sale types (Buy It Now, Auction, Best Offer)
 *       - Returns statistics about fetched vs saved records
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assetId
 *             properties:
 *               assetId:
 *                 type: string
 *                 description: User asset ID to refresh
 *                 example: "af6ab6dd-e368-4df0-b7c1-3b69a5ba7378"
 *               useAIFiltering:
 *                 type: boolean
 *                 default: false
 *                 description: Apply AI filtering to results
 *     responses:
 *       200:
 *         description: Refresh completed with authentic marketplace data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Refreshed sales data successfully: 15 raw records → 8 new records saved"
 *                 salesCount:
 *                   type: integer
 *                   description: Total records fetched from marketplace
 *                   example: 15
 *                 savedCount:
 *                   type: integer
 *                   description: New records saved after deduplication
 *                   example: 8
 *       400:
 *         description: Missing asset ID or validation error
 *       401:
 *         description: Unauthorized - valid authentication token required
 *       404:
 *         description: Asset not found
 *       500:
 *         description: Server error
 */
// Use the modular refresh controller with authentication
router.post('/refresh', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid body', issues: parse.error.issues });
  }
  // body validated; let controller handle
  return refreshCardSales(req, res);
});

// Legacy compatibility: older clients call /api/sales-history-refresh/refresh
router.post('/sales-history-refresh/refresh', authenticateUser, (req: AuthenticatedRequest, res: Response) => {
  const parse = refreshSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid body', issues: parse.error.issues });
  }
  return refreshCardSales(req, res);
});

// Fix for the broken refresh endpoint
router.post('/sales-history-v2/refresh', (req, res) => {
  res.status(200).json({ 
    success: true, 
    message: 'Endpoint deprecated. Use /refresh instead.' 
  });
});

export default router;