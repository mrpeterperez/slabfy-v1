import express from "express";
import { DatabaseStorage } from "../storage";
import { authenticateUser, AuthenticatedRequest } from "../supabase";
import { withUserDb } from "../db";

const router = express.Router();

// Require authentication for all portfolio routes
router.use(authenticateUser);

/**
 * @swagger
 * /api/portfolio/summary/{userId}:
 *   get:
 *     summary: Get comprehensive portfolio summary
 *     description: |
 *       Returns complete portfolio summary including total assets, values, and breakdown 
 *       by ownership type (owned vs consignment). Aggregates data from user assets,
 *       consignment assets, and current market pricing.
 *     tags: [Portfolio]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User's unique ID
 *         example: "a31cc62b-45e0-487e-8a09-2abf0114ee82"
 *     responses:
 *       200:
 *         description: Portfolio summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalAssets:
 *                   type: integer
 *                   description: Total number of assets (owned + consignment)
 *                   example: 150
 *                 totalPurchaseValue:
 *                   type: number
 *                   format: decimal
 *                   description: Total purchase value of owned assets
 *                   example: 12500.00
 *                 totalMarketValue:
 *                   type: number
 *                   format: decimal
 *                   description: Total current market value of all assets
 *                   example: 15750.00
 *                 totalConsignmentValue:
 *                   type: number
 *                   format: decimal
 *                   description: Total asking value of consignment assets
 *                   example: 8200.00
 *                 breakdown:
 *                   type: object
 *                   properties:
 *                     owned:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           description: Number of owned assets
 *                           example: 125
 *                         purchaseValue:
 *                           type: number
 *                           format: decimal
 *                           description: Total purchase value of owned assets
 *                           example: 12500.00
 *                         marketValue:
 *                           type: number
 *                           format: decimal
 *                           description: Current market value of owned assets
 *                           example: 13200.00
 *                         personalValue:
 *                           type: number
 *                           format: decimal
 *                           description: Total personal value assigned to owned assets
 *                           example: 14000.00
 *                     consignment:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           description: Number of consignment assets
 *                           example: 25
 *                         consignorValue:
 *                           type: number
 *                           format: decimal
 *                           description: Total consignor price for consignment assets
 *                           example: 6500.00
 *                         askingValue:
 *                           type: number
 *                           format: decimal
 *                           description: Total asking price for consignment assets
 *                           example: 8200.00
 *                         marketValue:
 *                           type: number
 *                           format: decimal
 *                           description: Current market value of consignment assets
 *                           example: 2550.00
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch portfolio summary"
 */
router.get("/summary/:userId", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.params.userId;
    const authUserId = req.user?.id;
    if (!authUserId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (authUserId !== userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Run DB operations within an RLS-scoped session
    await withUserDb({ userId: authUserId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = new DatabaseStorage(scopedDb);

      // Verify user exists under scoped session
      const user = await scopedStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get portfolio summary
      const summary = await scopedStorage.getPortfolioSummary(userId);
      return res.json(summary);
    });
  } catch (error) {
    console.error("Error fetching portfolio summary:", error);
    res.status(500).json({ error: "Failed to fetch portfolio summary" });
  }
});

export default router;