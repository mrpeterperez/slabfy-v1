// 🤖 INTERNAL NOTE:
// Purpose: Title generation for consignments
// Exports: Express router with next-title route
// Feature: consignments (server)
// Dependencies: storage, supabase auth

import { Router } from "express";
import { storage } from "../../storage-mod/registry";
import { AuthenticatedRequest } from "../../supabase";

const router = Router();

// Get next auto-generated consignment title (must be before /:id route)
router.get("/next-title", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const nextTitle = await storage.generateNextConsignmentTitle(userId);
    res.json({ title: nextTitle });
  } catch (error) {
    console.error("Error generating next consignment title:", error);
    res.status(500).json({ error: "Failed to generate next consignment title" });
  }
});

export default router;