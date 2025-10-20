// 🤖 INTERNAL NOTE:
// Purpose: Dashboard batch endpoint for consolidated summary data
// Exports: Express router with dashboard summary route
// Feature: dashboard (server)
// Dependencies: storage, express, supabase auth

import { Router } from "express";
import { storage } from "../storage-mod/registry";
import { authenticateUser, AuthenticatedRequest } from "../supabase";

const router = Router();

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get consolidated dashboard summary (batch endpoint)
 *     description: Fetches all summary data in a single request - consignments stats, consignments summary, contacts summary, events summary, and collections summary
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Dashboard summary retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 consignments:
 *                   type: object
 *                   properties:
 *                     stats:
 *                       type: object
 *                       properties:
 *                         totalConsignmentValue:
 *                           type: number
 *                         totalExpectedHouseShare:
 *                           type: number
 *                         activeConsignments:
 *                           type: number
 *                     summary:
 *                       type: array
 *                       items:
 *                         type: object
 *                 contacts:
 *                   type: object
 *                 events:
 *                   type: object
 *                 collections:
 *                   type: object
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Server error
 */
router.get("/summary", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Make all summary calls in parallel for optimal performance
    const [
      consignmentsData,
      contactsSummary,
      eventsSummary,
      collectionsSummary
    ] = await Promise.all([
      storage.getConsignmentsByUserId(userId),
      storage.getContactsSummary(userId, undefined), // undefined = all contacts (archived + active)
      storage.getEventsSummary(userId),
      storage.getCollectionsSummary(userId)
    ]);

    // Process consignments stats (same logic as /api/consignments/stats)
    let totalConsignmentValue = 0;
    let totalExpectedHouseShare = 0;
    let activeConsignments = 0;

    for (const c of consignmentsData) {
      totalConsignmentValue += Number(c.pipelineValue || 0);
      totalExpectedHouseShare += Number(c.potentialProfit || 0);
      if (String(c.status).toLowerCase() === "active") activeConsignments += 1;
    }

    // Process consignments summary (same logic as /api/consignments/summary)
    const consignmentsSummary = consignmentsData.map((c: any) => ({
      consignmentId: c.id,
      title: c.title,
      consignorName: c.consignorName,
      assetsCount: c.totalAssets,
      revenue: c.totalValue,
      pipelineValue: c.pipelineValue,
      profit: c.potentialProfit
    }));

    // Return consolidated response
    res.json({
      consignments: {
        stats: {
          totalConsignmentValue: Math.round(totalConsignmentValue * 100) / 100,
          totalExpectedHouseShare: Math.round(totalExpectedHouseShare * 100) / 100,
          activeConsignments,
        },
        summary: consignmentsSummary
      },
      contacts: contactsSummary,
      events: eventsSummary,
      collections: collectionsSummary
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

export default router;
