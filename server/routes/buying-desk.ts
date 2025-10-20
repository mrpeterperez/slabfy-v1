// 🤖 INTERNAL NOTE:
// Purpose: Buying desk API routes - sessions, assets, settings
// Exports: Express router
// Feature: buying-desk-v0

import { Router } from "express";
import type { DatabaseStorage } from "../storage";

export function createBuyingDeskRouter(storage: DatabaseStorage) {
  const router = Router();

  // ===================================
  // BUYING DESK SETTINGS
  // ===================================

  /**
   * @swagger
   * /api/buying-desk/settings:
   *   get:
   *     summary: Get buying desk settings for current user
   *     tags: [Buying Desk]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Buying desk settings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                 userId:
   *                   type: string
   *                 defaultOfferPercentage:
   *                   type: number
   *                   example: 90
   *                 housePercentage:
   *                   type: number
   *                   example: 10
   *                 priceRounding:
   *                   type: number
   *                   example: 5
   *                 autoDenyEnabled:
   *                   type: boolean
   *                   example: true
   *                 minLiquidityLevel:
   *                   type: string
   *                   example: "cold"
   *                 minConfidenceLevel:
   *                   type: number
   *                   example: 40
   *                 minMarketValue:
   *                   type: number
   *                   example: 10
   *                 targetFlipDays:
   *                   type: number
   *                   example: 14
   *                 minRoiPercentage:
   *                   type: number
   *                   example: 50
   */
  router.get("/settings", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get existing settings or return defaults
      let settings = await storage.getBuyingDeskSettings(userId);
      
      if (!settings) {
        // Create default settings for new users
        const defaults = {
          userId,
          defaultOfferPercentage: "90.00",
          pricingStrategy: "below_market",
          housePercentage: "10.00",
          priceRounding: 5,
          autoDenyEnabled: true,
          minLiquidityLevel: "cold",
          minConfidenceLevel: 40,
          minMarketValue: "10.00",
          requireReviewAll: false,
          allowCounterOffers: true,
          maxCounterRounds: 2,
          counterExpiryHours: 24,
          targetFlipDays: 14,
          minRoiPercentage: "50.00",
          realtimeNotifications: true,
          autoConfirmSales: false,
        };
        
        settings = await storage.createBuyingDeskSettings(defaults);
      }

      return res.json(settings);
    } catch (error) {
      console.error("[Buying Desk Settings] Error fetching settings:", error);
      return res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  /**
   * @swagger
   * /api/buying-desk/settings:
   *   post:
   *     summary: Update buying desk settings
   *     tags: [Buying Desk]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               defaultOfferPercentage:
   *                 type: number
   *               housePercentage:
   *                 type: number
   *               priceRounding:
   *                 type: number
   *               autoDenyEnabled:
   *                 type: boolean
   *               minLiquidityLevel:
   *                 type: string
   *               minConfidenceLevel:
   *                 type: number
   *               minMarketValue:
   *                 type: number
   *               targetFlipDays:
   *                 type: number
   *               minRoiPercentage:
   *                 type: number
   *     responses:
   *       200:
   *         description: Settings updated successfully
   */
  router.post("/settings", async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updateData = {
        ...req.body,
        updatedAt: new Date(),
      };

      // Check if settings exist
      const existing = await storage.getBuyingDeskSettings(userId);
      
      let settings;
      if (existing) {
        settings = await storage.updateBuyingDeskSettings(userId, updateData);
      } else {
        settings = await storage.createBuyingDeskSettings({
          userId,
          ...updateData,
        });
      }

      return res.json(settings);
    } catch (error) {
      console.error("[Buying Desk Settings] Error updating settings:", error);
      return res.status(500).json({ error: "Failed to update settings" });
    }
  });

  return router;
}
