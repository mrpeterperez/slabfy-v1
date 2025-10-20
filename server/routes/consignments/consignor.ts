// 🤖 INTERNAL NOTE:
// Purpose: Consignor management for consignments
// Exports: Express router with consignor get and update routes
// Feature: consignments (server)
// Dependencies: storage, zod validation, @shared/schema

import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage-mod/registry";
import { updateConsignorSchema } from "@shared/schema";

const router = Router();

/**
 * @swagger
 * /api/consignments/{id}/consignor:
 *   get:
 *     summary: Get consignor information for a consignment
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignor retrieved successfully
 *       404:
 *         description: Consignor not found
 */
router.get("/:id/consignor", async (req, res) => {
  try {
    const consignmentId = req.params.id;
    const consignor = await storage.getConsignorByConsignmentId(consignmentId);
    
    if (!consignor) {
      return res.status(404).json({ error: "Consignor not found" });
    }
    
    res.json(consignor);
  } catch (error) {
    console.error("Error fetching consignor:", error);
    res.status(500).json({ error: "Failed to fetch consignor" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}/consignor:
 *   patch:
 *     summary: Update consignor information
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignor updated successfully
 *       404:
 *         description: Consignor not found
 */
router.patch("/:id/consignor", async (req, res) => {
  try {
    const consignmentId = req.params.id;
    const updateData = updateConsignorSchema.parse(req.body);
    
    // The storage layer exposes getConsignorByConsignmentId and updateConsignor(consignmentId, data)
    const existing = await storage.getConsignorByConsignmentId(consignmentId);
    if (!existing) {
      return res.status(404).json({ error: "Consignor not found" });
    }
    const consignor = await storage.updateConsignor(consignmentId, updateData);
    
    if (!consignor) {
      return res.status(404).json({ error: "Consignor not found" });
    }
    
    res.json(consignor);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating consignor:", error);
    res.status(500).json({ error: "Failed to update consignor" });
  }
});

export default router;