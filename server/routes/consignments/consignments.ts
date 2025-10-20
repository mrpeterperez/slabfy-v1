// 🤖 INTERNAL NOTE:
// Purpose: Core CRUD operations for consignments (create, read, update, delete, archive)
// Exports: Express router with main consignment operations
// Feature: consignments (server)
// Dependencies: storage, zod validation, @shared/schema, supabase auth, db scoping

import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage-mod/registry";
import { authenticateUser, AuthenticatedRequest } from "../../supabase";
import { 
  insertConsignmentSchema, 
  updateConsignmentSchema,
  insertConsignorContactSchema
} from "@shared/schema";
import { withUserDb } from "../../db";
import { createStorage } from "../../storage-mod/registry";

const router = Router();

/**
 * @swagger
 * /api/consignments:
 *   get:
 *     summary: Get all consignments (temporary endpoint for collections)
 *     tags: [Consignments]
 *     responses:
 *       200:
 *         description: Consignments retrieved successfully
 */
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    // Return consignments for the authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Support archived filter: ?archived=true/false
    const archivedParam = req.query.archived as string | undefined;
    let archived: boolean | undefined = undefined;
    if (archivedParam === 'true') {
      archived = true;
    } else if (archivedParam === 'false') {
      archived = false;
    }

    const consignments = await storage.getConsignmentsByUserId(userId, archived);
    res.json(consignments);
  } catch (error) {
    console.error("Error fetching consignments:", error);
    res.status(500).json({ error: "Failed to fetch consignments" });
  }
});

/**
 * @swagger
 * /api/consignments/user/{userId}:
 *   get:
 *     summary: Get all consignments for a user
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignments retrieved successfully
 */
router.get("/user/:userId", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.params.userId;
    // Enforce that the authenticated user matches the requested userId
    const authUserId = req.user?.id;
    if (!authUserId || authUserId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Support both legacy archived filter and new status filter
    const archivedParam = req.query.archived as string | undefined;
    const statusParam = req.query.status as string | undefined;
    
    let archived: boolean | undefined = undefined;
    let status: string | undefined = undefined;
    
    // Handle legacy archived parameter for backwards compatibility
    if (archivedParam === 'true') {
      archived = true;
    } else if (archivedParam === 'false') {
      archived = false;
    }
    
    // Handle new status parameter (overrides archived if both provided)
    if (statusParam && statusParam !== 'all') {
      status = statusParam;
      archived = undefined; // Don't use archived filter when status is specified
    }
    
    const consignments = await storage.getConsignmentsByUserId(userId, archived, status);
    res.json(consignments);
  } catch (error) {
    console.error("Error fetching consignments:", error);
    res.status(500).json({ error: "Failed to fetch consignments" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}:
 *   get:
 *     summary: Get a consignment by ID
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignment retrieved successfully
 *       404:
 *         description: Consignment not found
 */
router.get("/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const consignmentId = req.params.id;
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const consignment = await storage.getConsignmentWithDetails(consignmentId);
    
    if (!consignment) {
      return res.status(404).json({ error: "Consignment not found" });
    }
    
    // SECURITY: Verify user owns the consignment before returning data
    if (consignment.userId !== userId) {
      return res.status(403).json({ error: "You can only access your own consignments" });
    }
    
    res.json(consignment);
  } catch (error) {
    console.error("Error fetching consignment:", error);
    res.status(500).json({ error: "Failed to fetch consignment" });
  }
});

/**
 * @swagger
 * /api/consignments:
 *   post:
 *     summary: Create a new consignment
 *     tags: [Consignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               defaultSplitPercentage:
 *                 type: number
 *               consignor:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                   phone:
 *                     type: string
 *     responses:
 *       201:
 *         description: Consignment created successfully
 */
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    console.log("✅ [CREATE CONSIGNMENT] Received request body:", JSON.stringify(req.body, null, 2));
    
    // Get authenticated user ID
    const userId = req.user?.id;
    if (!userId) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[consignments:create] missing_req_user_after_auth_middleware');
      }
      return res.status(401).json({ error: "Authentication required" });
    }
    
    // Validate the consignment data (extract only consignment fields)
    const { consignor, contact, userId: bodyUserId, ...consignmentFields } = req.body;
    console.log("📋 [CREATE CONSIGNMENT] Consignment fields for validation:", JSON.stringify(consignmentFields, null, 2));
    let consignmentData = insertConsignmentSchema.parse(consignmentFields);
    console.log("✅ [CREATE CONSIGNMENT] Consignment validation passed");

    // Auto-generate title if not provided to satisfy DB NOT NULL constraint
    if (!consignmentData.title || String(consignmentData.title).trim() === "") {
      const autoTitle = await storage.generateNextConsignmentTitle(userId);
      consignmentData = { ...consignmentData, title: autoTitle } as typeof consignmentData;
      console.log("🏷️  [CREATE CONSIGNMENT] Auto-generated title:", autoTitle);
    }
    
    // Validate the contact data for the consignor
    const contactData = req.body.consignor || req.body.contact; // Support both field names
    console.log("👤 [CREATE CONSIGNMENT] Contact data for validation:", JSON.stringify(contactData, null, 2));
    const validatedContactData = insertConsignorContactSchema.parse(contactData);
    console.log("✅ [CREATE CONSIGNMENT] Contact validation passed");
    
    // Create the consignment with consignor (creates contact + consignor + consignment)
    const consignment = await storage.createConsignment({
      ...consignmentData,
      userId,
    }, validatedContactData);
    console.log("🎉 [CREATE CONSIGNMENT] Successfully created consignment:", consignment.id);
    
    res.status(201).json(consignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ [CREATE CONSIGNMENT] Zod validation error:", JSON.stringify(error.errors, null, 2));
      return res.status(400).json({ error: error.errors });
    }
    console.error("❌ [CREATE CONSIGNMENT] Unexpected error:", error);
    res.status(500).json({ error: "Failed to create consignment" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}:
 *   patch:
 *     summary: Update a consignment
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Consignment updated successfully
 *       404:
 *         description: Consignment not found
 */
router.patch("/:id", async (req, res) => {
  try {
    const consignmentId = req.params.id;
    const updateData = updateConsignmentSchema.parse(req.body);
    
    const consignment = await storage.updateConsignment(consignmentId, updateData);
    
    if (!consignment) {
      return res.status(404).json({ error: "Consignment not found" });
    }
    
    res.json(consignment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Error updating consignment:", error);
    res.status(500).json({ error: "Failed to update consignment" });
  }
});

/**
 * @swagger
 * /api/consignments/{id}:
 *   delete:
 *     summary: Delete a consignment
 *     tags: [Consignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Consignment deleted successfully
 *       404:
 *         description: Consignment not found
 */
router.delete("/:id", async (req, res) => {
  try {
    const consignmentId = req.params.id;
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);

      // Optional ownership check (RLS also enforces this)
      const existing = await scopedStorage.getConsignmentById(consignmentId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Consignment not found" });
      }

      const deleted = await scopedStorage.deleteConsignment(consignmentId);
      if (!deleted) {
        return res.status(404).json({ error: "Consignment not found" });
      }

      return res.status(204).send();
    });
  } catch (error) {
    console.error("Error deleting consignment:", error);
    res.status(500).json({ error: "Failed to delete consignment" });
  }
});

// Archive endpoints
router.patch("/:id/archive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const consignmentId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);

      // Ensure ownership before archiving
      const existing = await scopedStorage.getConsignmentById(consignmentId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Consignment not found" });
      }

      const consignment = await scopedStorage.archiveConsignment(consignmentId);

      if (!consignment) {
        return res.status(404).json({ error: "Consignment not found" });
      }

      return res.json(consignment);
    });
  } catch (error) {
    console.error("Error archiving consignment:", error);
    res.status(500).json({ error: "Failed to archive consignment" });
  }
});

router.patch("/:id/unarchive", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    const consignmentId = req.params.id;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await withUserDb({ userId, role: 'authenticated' }, async (scopedDb) => {
      const scopedStorage = createStorage(scopedDb);

      // Ensure ownership before unarchiving
      const existing = await scopedStorage.getConsignmentById(consignmentId);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Consignment not found" });
      }

      const consignment = await scopedStorage.unarchiveConsignment(consignmentId);

      if (!consignment) {
        return res.status(404).json({ error: "Consignment not found" });
      }

      return res.json(consignment);
    });
  } catch (error) {
    console.error("Error unarchiving consignment:", error);
    res.status(500).json({ error: "Failed to unarchive consignment" });
  }
});

export default router;