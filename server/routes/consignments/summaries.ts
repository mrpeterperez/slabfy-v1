// 🤖 INTERNAL NOTE:
// Purpose: Summary and stats endpoints for consignments
// Exports: Express router with summary, stats, and status-counts routes
// Feature: consignments (server)
// Dependencies: storage, @shared/schema, supabase auth

import { Router } from "express";
import { storage } from "../../storage-mod/registry";
import { AuthenticatedRequest } from "../../supabase";

const router = Router();

/**
 * @swagger
 * /api/consignments/summary:
 *   get:
 *     summary: Get consignment summaries for all user consignments
 *     tags: [Consignments]
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignment summaries retrieved successfully
 */
router.get("/summary", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      return res.status(400).json({ error: "userId query parameter is required" });
    }
    
    const consignments = await storage.getConsignmentsByUserId(userId);
    const summaries = consignments.map((c: any) => ({
      consignmentId: c.id,
      title: c.title,
      consignorName: c.consignorName,
      assetsCount: c.totalAssets,
      revenue: c.totalValue,
      pipelineValue: c.pipelineValue,
      profit: c.potentialProfit
    }));
    
    res.json(summaries);
  } catch (error) {
    console.error("Error fetching consignment summaries:", error);
    res.status(500).json({ error: "Failed to fetch consignment summaries" });
  }
});

/**
 * @swagger
 * /api/consignments/stats:
 *   get:
 *     summary: Get aggregate consignment stats for the authenticated user
 *     tags: [Consignments]
 *     responses:
 *       200:
 *         description: Aggregate stats retrieved successfully
 */
router.get("/stats", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get only ACTIVE (non-archived) consignments for stats
    const consignments = await storage.getConsignmentsByUserId(userId, false); // false = not archived

    // Aggregate across consignments
    let totalConsignmentValue = 0; // sum of pipeline (asking) values
    let totalExpectedHouseShare = 0; // sum of potential profit (our share)
    let activeConsignments = 0; // count of active consignments

    for (const c of consignments) {
      totalConsignmentValue += Number(c.pipelineValue || 0);
      totalExpectedHouseShare += Number(c.potentialProfit || 0);
      if (String(c.status).toLowerCase() === "active") activeConsignments += 1;
    }

    res.json({
      totalConsignmentValue: Math.round(totalConsignmentValue * 100) / 100,
      totalExpectedHouseShare: Math.round(totalExpectedHouseShare * 100) / 100,
      activeConsignments,
    });
  } catch (error) {
    console.error("Error fetching consignment stats:", error);
    res.status(500).json({ error: "Failed to fetch consignment stats" });
  }
});

/**
 * @swagger
 * /api/consignments/status-counts:
 *   get:
 *     summary: Get count of consignments by status for the authenticated user
 *     tags: [Consignments]
 *     responses:
 *       200:
 *         description: Status counts retrieved successfully
 */
router.get("/status-counts", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get all consignments to count by status
    const allConsignments = await storage.getConsignmentsByUserId(userId);
    
    const counts = {
      all: allConsignments.length,
      active: 0,
      on_hold: 0,
      returned: 0,
      sold: 0,
      draft: 0,
    };

    // Count by status
    for (const consignment of allConsignments) {
      const status = String(consignment.status || 'draft').toLowerCase();
      switch (status) {
        case 'active':
          counts.active += 1;
          break;
        case 'on_hold':
        case 'paused': // legacy compatibility
          counts.on_hold += 1;
          break;
        case 'returned':
          counts.returned += 1;
          break;
        case 'sold':
        case 'completed': // legacy compatibility
          counts.sold += 1;
          break;
        case 'draft':
        case 'cancelled': // legacy compatibility
          counts.draft += 1;
          break;
      }
    }

    res.json(counts);
  } catch (error) {
    console.error("Error fetching consignment status counts:", error);
    res.status(500).json({ error: "Failed to fetch status counts" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}/summary:
 *   get:
 *     summary: Get summary metrics for a specific consignment
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignment summary retrieved successfully
 *       404:
 *         description: Consignment not found
 */
router.get("/:id/summary", async (req, res) => {
  try {
    const consignmentId = req.params.id;
    const consignment = await storage.getConsignmentById(consignmentId);
    
    if (!consignment) {
      return res.status(404).json({ error: "Consignment not found" });
    }
    
    // Use efficient SQL aggregations instead of loading all assets
    const stats = await storage.getConsignmentSummary(consignmentId);
    
    const summary = {
      consignmentId: consignment.id,
      title: consignment.title,
      consignorName: 'Unknown Consignor', // We'll need to enhance getConsignmentById later
      assetsCount: stats.assetsCount,
      revenue: stats.revenue,
      pipelineValue: stats.pipelineValue,
      profit: stats.profit
    };
    
    res.json(summary);
  } catch (error) {
    console.error("Error fetching consignment summary:", error);
    res.status(500).json({ error: "Failed to fetch consignment summary" });
  }
});

export default router;