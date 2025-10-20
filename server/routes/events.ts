// Events API routes for SlabFy
import { Router } from "express";
import { storage } from "../storage-mod/registry";
import { db } from "../db";
import { eventInventory, globalAssets, userAssets, consignmentAssets, consignments, collectionAssets, collections, salesTransactions, buyers, sellers, contacts, purchaseTransactions, events, storefrontOrders, storefrontOrderItems } from "@shared/schema";
import { and, eq, inArray, sql, desc, asc } from "drizzle-orm";
import { randomUUID } from "crypto";
import { insertEventSchema, updateEventSchema, insertSalesTransactionSchema } from "@shared/schema";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { authenticateUser, AuthenticatedRequest } from "../supabase";
import bulkRoutes from "./events/bulk";
import QRCode from 'qrcode';

const router = Router();

// Mount bulk routes
router.use("/bulk", authenticateUser, bulkRoutes);

/**
 * @swagger
 * /api/events/public/{eventId}:
 *   get:
 *     summary: Get event data for public storefront (NO AUTH REQUIRED)
 *     description: Public endpoint for loading event data on storefront pages. Only returns basic event info, no sensitive data.
 *     tags: [Events, Public]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Event data retrieved successfully
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.get("/public/:eventId", async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await storage.getEvent(eventId);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Return event data (safe for public access)
    res.json(event);
  } catch (error) {
    console.error("Error fetching public event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Get all events for authenticated user
router.get("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get archived query parameter (defaults to false for active events)
    const archived = req.query.archived === 'true';
    
    const events = await storage.getEventsByUserId(userId, archived);
    res.json(events);
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// Get events summary statistics
router.get("/summary", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const summary = await storage.getEventsSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error("Error fetching events summary:", error);
    res.status(500).json({ error: "Failed to fetch events summary" });
  }
});

// Get purchase counts for events (for buying desk integration)
router.get("/purchase-counts", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const purchaseCounts = await db
      .select({
        eventId: sql<string>`COALESCE(${purchaseTransactions.eventId}, 'null')`,
        purchaseCount: sql<number>`COUNT(${purchaseTransactions.id})`,
      })
      .from(purchaseTransactions)
      .where(eq(purchaseTransactions.userId, userId))
      .groupBy(purchaseTransactions.eventId);

    const countsMap = purchaseCounts.reduce((acc, row) => {
      const eventId = row.eventId === 'null' ? null : row.eventId;
      acc[eventId || 'standalone'] = Number(row.purchaseCount);
      return acc;
    }, {} as Record<string, number>);

    res.json(countsMap);
  } catch (error) {
    console.error("Error fetching purchase counts:", error);
    res.status(500).json({ error: "Failed to fetch purchase counts" });
  }
});

// Get single event by ID
router.get("/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const event = await storage.getEvent(req.params.id);
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Ensure user owns this event
    if (event.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(event);
  } catch (error) {
    console.error("Error fetching event:", error);
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

// Create new event
router.post("/", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Validate request body
    const validationResult = insertEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid event data",
        details: validationResult.error.errors
      });
    }

    const eventData = {
      ...validationResult.data,
      id: uuidv4(),
      userId,
    };

    const newEvent = await storage.createEvent(eventData);
    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// Update existing event
router.patch("/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if event exists and user owns it
    const existingEvent = await storage.getEvent(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existingEvent.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Validate request body
    const validationResult = updateEventSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Invalid event data",
        details: validationResult.error.errors
      });
    }

    // Auto-enable storefront when status is set to 'live'
    const updateData = { ...validationResult.data };
    if (updateData.status === 'live') {
      updateData.storefrontEnabled = true;
    }

    const updatedEvent = await storage.updateEvent(req.params.id, updateData);
    res.json(updatedEvent);
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// Delete event
router.delete("/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if event exists and user owns it
    const existingEvent = await storage.getEvent(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existingEvent.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Block deletion of archived events - they are permanently protected
    if (existingEvent.archived) {
      return res.status(400).json({
        error: 'Event is already archived and cannot be deleted',
        message: 'Archived events are permanently preserved to protect financial records',
        isArchived: true,
      });
    }

    // Check if active event has associated financial data
    const hasFinancialData = 
      ((existingEvent.soldCount && existingEvent.soldCount > 0) || 
       (existingEvent.purchasedCount && existingEvent.purchasedCount > 0));

    if (hasFinancialData) {
      // MUST archive - has financial records that need to be preserved
      return res.status(400).json({ 
        error: "Cannot delete event with financial history",
        details: "This event has sales or purchase transactions. Please archive instead.",
        shouldArchive: true,
        soldCount: existingEvent.soldCount || 0,
        purchasedCount: existingEvent.purchasedCount || 0
      });
    }

    // Safe to hard delete - clean active event only
    await storage.deleteEvent(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).json({ error: "Failed to delete event" });
  }
});

// Archive event
router.patch("/:id/archive", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if event exists and user owns it
    const existingEvent = await storage.getEvent(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existingEvent.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const archivedEvent = await storage.archiveEvent(req.params.id);
    res.json(archivedEvent);
  } catch (error) {
    console.error("Error archiving event:", error);
    res.status(500).json({ error: "Failed to archive event" });
  }
});

// Unarchive event
router.patch("/:id/unarchive", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Check if event exists and user owns it
    const existingEvent = await storage.getEvent(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (existingEvent.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const unarchivedEvent = await storage.unarchiveEvent(req.params.id);
    res.json(unarchivedEvent);
  } catch (error) {
    console.error("Error unarchiving event:", error);
    res.status(500).json({ error: "Failed to unarchive event" });
  }
});

/**
 * @swagger
 * /api/events/{id}/assets:
 *   post:
 *     summary: Attach assets to an event inventory
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [globalAssetIds]
 *             properties:
 *               globalAssetIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               sourceType:
 *                 type: string
 *                 description: portfolio | consignment
 *     responses:
 *       200:
 *         description: Assets attached result
 */
// Add assets to event inventory
router.post("/:id/assets", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    const body = req.body || {};
    const globalAssetIds: string[] = Array.isArray(body.globalAssetIds) ? body.globalAssetIds : [];
    if (!globalAssetIds.length) return res.status(400).json({ error: "globalAssetIds is required" });

    // Avoid duplicates for this event
    const existing = await db
      .select({ globalAssetId: eventInventory.globalAssetId })
      .from(eventInventory)
      .where(and(eq(eventInventory.eventId, event.id), inArray(eventInventory.globalAssetId, globalAssetIds)));
    const existingSet = new Set(existing.map(r => r.globalAssetId));
    const toInsert = globalAssetIds.filter((gid: string) => !existingSet.has(gid));
    if (toInsert.length) {
      // Determine ownership for these assets at insert time
      const consignmentRows = await db
        .select({ globalAssetId: consignmentAssets.globalAssetId })
        .from(consignmentAssets)
        .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
        .where(and(eq(consignments.userId, event.userId), inArray(consignmentAssets.globalAssetId, toInsert)));
      const consignmentSet = new Set(consignmentRows.map(r => r.globalAssetId));

      await db.insert(eventInventory).values(
        toInsert.map((gid: string) => ({
          id: randomUUID(),
          eventId: event.id,
          globalAssetId: gid,
          // Prefer explicit body.sourceType if provided; otherwise infer
          sourceType: body.sourceType ? String(body.sourceType) : (consignmentSet.has(gid) ? "consignment" : "portfolio"),
          addedAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }
    return res.json({ added: toInsert.length, skipped: existingSet.size });
  } catch (error) {
    console.error("Error adding assets to event:", error);
    return res.status(500).json({ error: "Failed to add assets to event" });
  }
});

/**
 * @swagger
 * /api/events/{id}/collections:
 *   post:
 *     summary: Attach entire collections to an event inventory
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [collectionIds]
 *             properties:
 *               collectionIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Collections attached result
 */
// Add collections to event inventory (attach all assets from selected collections)
router.post("/:id/collections", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    const body = req.body || {};
    const collectionIds: string[] = Array.isArray(body.collectionIds) ? body.collectionIds : [];
    if (!collectionIds.length) return res.status(400).json({ error: "collectionIds is required" });

    // Fetch assets for each collection via storage helper
    // We'll use storage.getCollectionAssets to retrieve globalAssetId list
    const allAssets: { globalAssetId: string }[] = [];
    for (const cid of collectionIds) {
      try {
        const assets = await storage.getCollectionAssets(cid);
        for (const a of assets) {
          if (a.globalAssetId) allAssets.push({ globalAssetId: a.globalAssetId });
        }
      } catch (e) {
        console.warn(`Failed to fetch assets for collection ${cid}:`, e);
      }
    }

    const globalAssetIds = Array.from(new Set(allAssets.map(a => a.globalAssetId)));
    if (!globalAssetIds.length) return res.json({ added: 0, skipped: 0, collections: collectionIds.length });

    // Avoid duplicates for this event
    const existing = await db
      .select({ globalAssetId: eventInventory.globalAssetId })
      .from(eventInventory)
      .where(and(eq(eventInventory.eventId, event.id), inArray(eventInventory.globalAssetId, globalAssetIds)));
    const existingSet = new Set(existing.map(r => r.globalAssetId));
    const toInsert = globalAssetIds.filter((gid: string) => !existingSet.has(gid));

    if (toInsert.length) {
      await db.insert(eventInventory).values(
        toInsert.map((gid: string) => ({
          id: randomUUID(),
          eventId: event.id,
          globalAssetId: gid,
          sourceType: "collection",
          addedAt: new Date(),
          updatedAt: new Date(),
        }))
      );
    }

    return res.json({ added: toInsert.length, skipped: existingSet.size, collections: collectionIds.length });
  } catch (error) {
    console.error("Error adding collections to event:", error);
    return res.status(500).json({ error: "Failed to add collections to event" });
  }
});

/**
 * @swagger
 * /api/events/{id}/inventory:
 *   get:
 *     summary: List event inventory items
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of inventory items
 */
// List event inventory
router.get("/:id/inventory", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    const rows = await db
      .select({ item: eventInventory, asset: globalAssets })
      .from(eventInventory)
      .leftJoin(globalAssets, eq(eventInventory.globalAssetId, globalAssets.id))
      .where(eq(eventInventory.eventId, event.id))
      .orderBy(sql`${eventInventory.addedAt} DESC`);

    // Build helper sets/maps for ownership and collection info
    const globalAssetIds = rows.map(r => r.item.globalAssetId).filter(Boolean) as string[];

    let portfolioSet = new Set<string>();
  let consignmentSet = new Set<string>();
  const purchasePriceMap = new Map<string, string | null>();
    const userAssetIdMap = new Map<string, string>();
    const collectionMap = new Map<string, { id: string; name: string }>();

    if (globalAssetIds.length) {
      // Portfolio membership for this user (+ purchase price)
      const portfolioRows = await db
        .select({ globalAssetId: userAssets.globalAssetId, purchasePrice: userAssets.purchasePrice, userAssetId: userAssets.id })
        .from(userAssets)
        .where(and(
          eq(userAssets.userId, event.userId),
          inArray(userAssets.globalAssetId, globalAssetIds),
          eq(userAssets.isActive, true) // only consider active portfolio items
        ));
      portfolioSet = new Set(portfolioRows.map(r => r.globalAssetId));
      for (const row of portfolioRows) {
        purchasePriceMap.set(row.globalAssetId, row.purchasePrice ?? null);
        if (row.userAssetId) userAssetIdMap.set(row.globalAssetId, row.userAssetId);
      }

      // Consignment membership for this user
      const consignmentRows = await db
        .select({ globalAssetId: consignmentAssets.globalAssetId, consignmentUserId: consignments.userId })
        .from(consignmentAssets)
        .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
        .where(and(eq(consignments.userId, event.userId), inArray(consignmentAssets.globalAssetId, globalAssetIds)));
      consignmentSet = new Set(consignmentRows.map(r => r.globalAssetId));

      // Collection membership (pick first collection for this user)
      const collectionRows = await db
        .select({
          globalAssetId: collectionAssets.globalAssetId,
          collectionId: collections.id,
          collectionName: collections.name,
        })
        .from(collectionAssets)
        .innerJoin(collections, eq(collectionAssets.collectionId, collections.id))
        .where(and(eq(collections.userId, event.userId), inArray(collectionAssets.globalAssetId, globalAssetIds)));
      for (const row of collectionRows) {
        if (!collectionMap.has(row.globalAssetId)) {
          collectionMap.set(row.globalAssetId, { id: row.collectionId, name: row.collectionName || "" });
        }
      }
    }

    const items = rows.map(({ item, asset }) => ({
      id: item.id,
      eventId: item.eventId,
      globalAssetId: item.globalAssetId,
      sourceType: item.sourceType,
      ownershipType: (consignmentSet.has(item.globalAssetId) || item.sourceType === "consignment") ? "consignment" : "portfolio",
      userAssetId: userAssetIdMap.get(item.globalAssetId) || null,
      collection: collectionMap.get(item.globalAssetId) || null,
      askingPrice: item.askingPrice,
      costBasis: item.costBasis,
      purchasePrice: purchasePriceMap.get(item.globalAssetId) ?? null,
      status: item.status,
      notes: item.notes,
      qty: item.qty,
      addedAt: item.addedAt,
      updatedAt: item.updatedAt,
      // display
      title: asset?.title,
      playerName: asset?.playerName,
      setName: asset?.setName,
      year: asset?.year,
      cardNumber: asset?.cardNumber,
      grade: asset?.grade,
      psaImageFrontUrl: asset?.psaImageFrontUrl,
  certNumber: asset?.certNumber,
      cardId: asset?.cardId,
    }));
    return res.json(items);
  } catch (error) {
    console.error("Error listing event inventory:", error);
    return res.status(500).json({ error: "Failed to list event inventory" });
  }
});

/**
 * @swagger
 * /api/events/{id}/available-inventory:
 *   get:
 *     summary: Get public available inventory for an event storefront (no auth required)
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Array of available inventory items for storefront
 *       404:
 *         description: Event not found or storefront not enabled
 */
// Get public available inventory for event storefront (no auth required)
router.get("/:id/available-inventory", async (req, res) => {
  try {
    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    
    // Check if storefront is enabled for this event
    if (!event.storefrontEnabled) {
      return res.status(404).json({ error: "Storefront not enabled for this event" });
    }

    // Fetch only items with status = 'available'
    const rows = await db
      .select({ item: eventInventory, asset: globalAssets })
      .from(eventInventory)
      .leftJoin(globalAssets, eq(eventInventory.globalAssetId, globalAssets.id))
      .where(
        and(
          eq(eventInventory.eventId, event.id),
          eq(eventInventory.status, 'available')
        )
      )
      .orderBy(sql`${eventInventory.addedAt} DESC`);

    // Return minimal data needed for storefront display
    const items = rows.map(({ item, asset }) => ({
      id: item.id,
      eventInventoryId: item.id, // For cart/checkout to reference
      eventId: item.eventId,
      globalAssetId: item.globalAssetId,
      // Asset metadata
      title: asset?.title || 'Unknown Item',
      playerName: asset?.playerName,
      year: asset?.year,
      setName: asset?.setName,
      cardNumber: asset?.cardNumber,
      grade: asset?.grade,
      grader: asset?.grader,
      certNumber: asset?.certNumber,
      psaImageFrontUrl: asset?.psaImageFrontUrl,
      psaImageBackUrl: asset?.psaImageBackUrl,
      category: asset?.category,
      type: asset?.type,
      // Pricing
      askingPrice: item.askingPrice,
      // Quantity available
      qty: item.qty || 1,
    }));

    return res.json(items);
  } catch (error) {
    console.error("Error fetching event available inventory:", error);
    return res.status(500).json({ error: "Failed to fetch event inventory" });
  }
});

/**
 * @swagger
 * /api/events/{id}/inventory/{itemId}:
 *   patch:
 *     summary: Update fields on an event inventory item
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               askingPrice:
 *                 type: number
 *               costBasis:
 *                 type: number
 *               status:
 *                 type: string
 *               notes:
 *                 type: string
 *               qty:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Updated item
 */
// Update an inventory item
router.patch("/:id/inventory/:itemId", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    const data = req.body || {};
    const updateData: any = { updatedAt: new Date() };
    if (data.askingPrice !== undefined) updateData.askingPrice = data.askingPrice === null ? null : String(data.askingPrice);
    if (data.costBasis !== undefined) updateData.costBasis = data.costBasis === null ? null : String(data.costBasis);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.qty !== undefined) updateData.qty = data.qty;

    const [row] = await db
      .update(eventInventory)
      .set(updateData)
      .where(and(eq(eventInventory.eventId, event.id), eq(eventInventory.id, req.params.itemId)))
      .returning();
    if (!row) return res.status(404).json({ error: "Item not found" });
    return res.json(row);
  } catch (error) {
    console.error("Error updating event inventory item:", error);
    return res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * @swagger
 * /api/events/{id}/inventory/{itemId}:
 *   delete:
 *     summary: Remove an event inventory item
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Item removed
 */
// Remove an inventory item
router.delete("/:id/inventory/:itemId", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    const result = await db
      .delete(eventInventory)
      .where(and(eq(eventInventory.eventId, event.id), eq(eventInventory.id, req.params.itemId)));
    if (!result.rowCount) return res.status(404).json({ error: "Item not found" });
    return res.status(204).send();
  } catch (error) {
    console.error("Error removing event inventory item:", error);
    return res.status(500).json({ error: "Failed to remove item" });
  }
});

// Undo sell - reverse a sale and restore item to available status
router.patch("/:id/inventory/:itemId/undo-sell", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    // Get the inventory item to check sourceType
    const [inventoryItem] = await db
      .select()
      .from(eventInventory)
      .where(and(eq(eventInventory.eventId, event.id), eq(eventInventory.id, req.params.itemId)))
      .limit(1);

    if (!inventoryItem) return res.status(404).json({ error: "Item not found" });

    // Update event inventory status back to available
    await db
      .update(eventInventory)
      .set({ status: "available", updatedAt: new Date() })
      .where(eq(eventInventory.id, req.params.itemId));

    // Get sales transactions to find associated orders (before deleting)
    const salesWithOrders = await db
      .select({ orderId: salesTransactions.orderId })
      .from(salesTransactions)
      .where(eq(salesTransactions.eventInventoryId, req.params.itemId));

    // Delete/cancel any associated orders
    const orderIds = salesWithOrders
      .map(s => s.orderId)
      .filter(Boolean) as string[];
    
    if (orderIds.length > 0) {
      // Delete order items first (foreign key constraint)
      await db
        .delete(storefrontOrderItems)
        .where(inArray(storefrontOrderItems.orderId, orderIds));
      
      // Delete orders
      await db
        .delete(storefrontOrders)
        .where(inArray(storefrontOrders.id, orderIds));
    }

    // Delete all sales transactions for this inventory item
    await db
      .delete(salesTransactions)
      .where(eq(salesTransactions.eventInventoryId, req.params.itemId));

    // Reverse the portfolio/consignment status based on sourceType
    if (inventoryItem.sourceType === 'portfolio') {
      // Reset portfolio item back to active
      await db
        .update(userAssets)
        .set({ 
          ownershipStatus: 'active',
          soldAt: null,
          soldTo: null,
          soldPrice: null,
          updatedAt: new Date()
        })
        .where(and(
          eq(userAssets.userId, userId),
          eq(userAssets.globalAssetId, inventoryItem.globalAssetId)
        ));
    } else if (inventoryItem.sourceType === 'consignment') {
      // Find the consignment asset for this user and global asset
      const consignmentAsset = await db
        .select({ id: consignmentAssets.id })
        .from(consignmentAssets)
        .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
        .where(and(
          eq(consignments.userId, userId),
          eq(consignmentAssets.globalAssetId, inventoryItem.globalAssetId)
        ))
        .limit(1);

      if (consignmentAsset.length > 0) {
        // Reset consignment item back to Active
        await db
          .update(consignmentAssets)
          .set({ status: 'active', soldPrice: null, updatedAt: new Date() } as any)
          .where(eq(consignmentAssets.id, consignmentAsset[0].id));
      }
    }

    return res.json({ success: true, message: "Sale undone successfully" });
  } catch (error) {
    console.error("Error undoing sale:", error);
    return res.status(500).json({ error: "Failed to undo sale" });
  }
});

/**
 * @swagger
 * /api/events/{id}/sales:
 *   get:
 *     summary: Get all sales transactions for an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: Sales transactions retrieved successfully
 */
// Get all sales for an event
router.get("/:id/sales", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    const rows = await db
      .select({
        id: salesTransactions.id,
        eventInventoryId: salesTransactions.eventInventoryId,
        salePrice: salesTransactions.salePrice,
        saleDate: salesTransactions.saleDate,
        buyerId: salesTransactions.buyerId,
        paymentMethod: salesTransactions.paymentMethod,
      })
      .from(salesTransactions)
      .where(eq(salesTransactions.eventId, event.id))
      .orderBy(desc(salesTransactions.saleDate));

    res.json(rows.map(r => ({
      id: r.id,
      eventInventoryId: r.eventInventoryId,
      salePrice: Number(r.salePrice),
      saleDate: r.saleDate,
      buyerId: r.buyerId,
      paymentMethod: r.paymentMethod,
    })));
  } catch (error) {
    console.error("Error fetching event sales:", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

// Get purchases for an event (for quick UI fallback)
router.get("/:id/purchases", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    const rows = await db
      .select({
        id: purchaseTransactions.id,
        purchasePrice: purchaseTransactions.purchasePrice,
        purchaseDate: purchaseTransactions.purchaseDate,
      })
      .from(purchaseTransactions)
      .where(eq(purchaseTransactions.eventId, event.id))
      .orderBy(desc(purchaseTransactions.purchaseDate));

    res.json(rows);
  } catch (error) {
    console.error("Error fetching event purchases:", error);
    res.status(500).json({ error: "Failed to fetch purchases" });
  }
});

/**
 * @swagger
 * /api/events/{id}/sales:
 *   post:
 *     summary: Create a new sales transaction for an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventInventoryId, globalAssetId, salePrice, paymentMethod]
        const rows = await db
          .select({
            id: salesTransactions.id,
            eventInventoryId: salesTransactions.eventInventoryId,
            salePrice: salesTransactions.salePrice,
            saleDate: salesTransactions.saleDate,
            buyerId: salesTransactions.buyerId,
            paymentMethod: salesTransactions.paymentMethod,
          })
          .from(salesTransactions)
          .where(eq(salesTransactions.eventId, req.params.id))
          .orderBy(desc(salesTransactions.saleDate));

        // Minimal payload for quick UI aggregation
        res.json(rows.map(r => ({
          id: r.id,
          eventInventoryId: r.eventInventoryId,
          salePrice: Number(r.salePrice),
          saleDate: r.saleDate,
          buyerId: r.buyerId,
          paymentMethod: r.paymentMethod,
        })));
      userId,
      eventId: req.params.id,
    });

    if (!validationResult.success) {
      console.error("Sales transaction validation failed:", {
        requestBody: req.body,
        userId,
        eventId: req.params.id,
        validationErrors: validationResult.error.errors
      });
      return res.status(400).json({
        error: "Invalid sales transaction data",
        details: validationResult.error.errors
      });
    }

    const saleData = validationResult.data;

    // Calculate profit if cost basis is provided
    const salePrice = Number(saleData.salePrice);
    const costBasis = saleData.costBasis ? Number(saleData.costBasis) : null;
    const profit = costBasis ? salePrice - costBasis : null;

    // Handle buyer upsert if buyer contact is provided
    let buyerRecordId = null;
    if (saleData.buyerId) { // buyerId should be the contact ID from frontend
      // Check if buyer record already exists
      const existingBuyer = await db
        .select()
        .from(buyers)
        .where(and(eq(buyers.contactId, saleData.buyerId), eq(buyers.userId, userId)))
        .limit(1);

      if (existingBuyer.length > 0) {
        buyerRecordId = existingBuyer[0].id;
      } else {
        // Create new buyer record
        const buyerId = uuidv4();
        const [newBuyer] = await db
          .insert(buyers)
          .values({
            id: buyerId,
            contactId: saleData.buyerId,
            userId,
            isActive: true,
          })
          .returning();
        buyerRecordId = newBuyer.id;
      }
    }

    // Handle seller upsert based on source type
    let sellerRecordId = null;
    if (saleData.sourceType === 'portfolio') {
      // For portfolio sales, the seller is the current user's contact
      // Find or create the user's contact
      const userContact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, userId))
        .limit(1);

      if (userContact.length > 0) {
        // Check if seller record exists for this contact
        const existingSeller = await db
          .select()
          .from(sellers)
          .where(and(eq(sellers.contactId, userContact[0].id), eq(sellers.userId, userId)))
          .limit(1);

        if (existingSeller.length > 0) {
          sellerRecordId = existingSeller[0].id;
        } else {
          // Create new seller record
          const sellerId = uuidv4();
          const [newSeller] = await db
            .insert(sellers)
            .values({
              id: sellerId,
              contactId: userContact[0].id,
              userId,
              isActive: true,
            })
            .returning();
          sellerRecordId = newSeller.id;
        }
      }
    } else if (saleData.sellerId) {
      // For consignment sales, sellerId should be the consignor's contact ID
      const existingSeller = await db
        .select()
        .from(sellers)
        .where(and(eq(sellers.contactId, saleData.sellerId), eq(sellers.userId, userId)))
        .limit(1);

      if (existingSeller.length > 0) {
        sellerRecordId = existingSeller[0].id;
      } else {
        // Create new seller record
        const sellerId = uuidv4();
        const [newSeller] = await db
          .insert(sellers)
          .values({
            id: sellerId,
            contactId: saleData.sellerId,
            userId,
            isActive: true,
          })
          .returning();
        sellerRecordId = newSeller.id;
      }
    }

    // Create the sales transaction
    const salesId = uuidv4();
    const [newSale] = await db
      .insert(salesTransactions)
      .values({
        ...saleData,
        id: salesId,
        buyerId: buyerRecordId, // Reference to buyers table
        sellerId: sellerRecordId, // Reference to sellers table
        profit: profit ? String(profit) : null,
        saleDate: new Date(),
      })
      .returning();

    // Update the inventory item status to "sold" when we have an inventory row id
    if (saleData.eventInventoryId) {
      await db
        .update(eventInventory)
        .set({ 
          status: "sold",
          updatedAt: new Date(),
        })
        .where(eq(eventInventory.id, saleData.eventInventoryId));
    }

    // If the item came from the user's portfolio, mark it as sold with tracking information
    if (saleData.sourceType === 'portfolio') {
      try {
        // Prepare buyer identifier for soldTo field
        const soldTo = saleData.buyerId || saleData.buyerName || 'Unknown Buyer';
        
        await db
          .update(userAssets)
          .set({ 
            ownershipStatus: 'sold',
            soldAt: new Date(),
            soldTo: soldTo,
            soldPrice: String(salePrice),
            updatedAt: new Date() 
          })
          .where(and(
            eq(userAssets.userId, userId),
            eq(userAssets.globalAssetId, saleData.globalAssetId),
            eq(userAssets.isActive, true)
          ));
      } catch (e) {
        console.warn('Failed to mark portfolio asset as sold:', e);
      }
    }

    // If the item was a consignment, mark the consignment asset as sold and record soldPrice
    if (saleData.sourceType === 'consignment') {
      try {
        // Find consignment asset rows for this user and global asset
        const consignmentRows = await db
          .select({ id: consignmentAssets.id })
          .from(consignmentAssets)
          .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
          .where(and(
            eq(consignments.userId, userId),
            eq(consignmentAssets.globalAssetId, saleData.globalAssetId)
          ));

        const ids = consignmentRows.map(r => r.id);
        if (ids.length) {
          await db
            .update(consignmentAssets)
            .set({ status: 'sold', soldPrice: String(salePrice), updatedAt: new Date() } as any)
            .where(inArray(consignmentAssets.id, ids));
        }

        // Also mark the owner's user asset as sold if it exists
        const soldTo = saleData.buyerId || saleData.buyerName || 'Unknown Buyer';
        await db
          .update(userAssets)
          .set({ 
            ownershipStatus: 'sold',
            soldAt: new Date(),
            soldTo: soldTo,
            soldPrice: String(salePrice),
            updatedAt: new Date() 
          })
          .where(and(
            eq(userAssets.userId, userId),
            eq(userAssets.globalAssetId, saleData.globalAssetId),
            eq(userAssets.isActive, true),
            eq(userAssets.ownershipStatus, 'consignment')
          ));
      } catch (e) {
        console.warn('Failed to mark consignment asset as sold:', e);
      }
    }

    res.status(201).json(newSale);
  } catch (error) {
    console.error("Error creating sales transaction:", error);
    res.status(500).json({ error: "Failed to create sales transaction" });
  }
});



/**
 * @swagger
 * /api/events/{eventId}/generate-qr:
 *   post:
 *     summary: Generate QR code for event storefront
 *     description: Generates a QR code for the event's public storefront URL and stores it in the database
 *     tags: [Events]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: QR code generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 qrCodeUrl:
 *                   type: string
 *                   description: Data URL of the QR code image
 *                 storefrontUrl:
 *                   type: string
 *                   description: The storefront URL the QR code points to
 *       403:
 *         description: Unauthorized - user does not own this event
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.post("/:eventId/generate-qr", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Get event and verify ownership
    const event = await storage.getEvent(eventId);
    
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    if (event.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized - you do not own this event" });
    }

    // Generate storefront URL
    const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 5000}`;
    const storefrontUrl = `${baseUrl}/storefront/${eventId}`;

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(storefrontUrl, {
      width: 512,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    });

    // Update event with QR code URL and timestamp
    await db
      .update(events)
      .set({
        storefrontQrCodeUrl: qrCodeDataUrl,
        storefrontLastGeneratedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(events.id, eventId));

    console.log(`✅ Generated QR code for event ${eventId} (${event.name})`);

    res.json({
      success: true,
      qrCodeUrl: qrCodeDataUrl,
      storefrontUrl,
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    res.status(500).json({ error: "Failed to generate QR code" });
  }
});

/**
 * @swagger
 * /api/events/{id}/orders:
 *   get:
 *     summary: Get storefront orders for an event
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     responses:
 *       200:
 *         description: List of customer orders from storefront
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Event not found
 */
router.get("/:id/orders", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const event = await storage.getEvent(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.userId !== userId) return res.status(403).json({ error: "Access denied" });

    // Get all storefront orders for this event
    const orderRows = await db
      .select({
        order: storefrontOrders,
        orderItem: storefrontOrderItems,
        asset: globalAssets,
      })
      .from(storefrontOrders)
      .leftJoin(storefrontOrderItems, eq(storefrontOrders.id, storefrontOrderItems.orderId))
      .leftJoin(globalAssets, eq(storefrontOrderItems.globalAssetId, globalAssets.id))
      .where(eq(storefrontOrders.eventId, event.id))
      .orderBy(desc(storefrontOrders.createdAt));

    // Group order items by order ID
    const ordersMap = new Map<string, any>();

    for (const row of orderRows) {
      const orderId = row.order.id;
      
      if (!ordersMap.has(orderId)) {
        ordersMap.set(orderId, {
          ...row.order,
          items: [],
        });
      }

      // Add item to order if it exists
      if (row.orderItem && row.asset) {
        ordersMap.get(orderId).items.push({
          ...row.orderItem,
          asset: row.asset,
        });
      }
    }

    const orders = Array.from(ordersMap.values());

    console.log(`📋 Fetched ${orders.length} orders for event ${event.id} (${event.name})`);

    res.json(orders);
  } catch (error) {
    console.error("Error fetching event orders:", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

/**
 * @openapi
 * /api/events/{id}/orders/{orderId}:
 *   patch:
 *     summary: Update storefront order status
 *     description: Update order status (pending → confirmed/cancelled) and handle inventory changes
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, completed, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Order not found
 */
router.patch("/:id/orders/:orderId", authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { status } = req.body as { status?: string };
  const orderId = req.params.orderId;
  const eventIdFromPath = req.params.id;

    // Validate status
    const validStatuses = ["pending", "confirmed", "completed", "cancelled"] as const;
    if (!status || !validStatuses.includes(status as any)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Get the order
    const [order] = await db
      .select()
      .from(storefrontOrders)
      .where(eq(storefrontOrders.id, orderId));

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Verify event ownership
    const event = await storage.getEvent(order.eventId);
    if (!event || event.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Ensure the path event id matches the order's event id
    if (event.id !== eventIdFromPath) {
      return res.status(404).json({ error: "Order not found for this event" });
    }

    // Enforce allowed transitions:
    // - pending -> confirmed
    // - confirmed -> pending (undo)
    // - confirmed -> completed (checkout)
    // - cancelled -> pending (reopen)
    // - any -> cancelled (pass)
    if (status === "completed" && order.status !== "confirmed") {
      return res.status(400).json({ error: "Only confirmed orders can be completed" });
    }
    if (status === "confirmed" && order.status !== "pending") {
      return res.status(400).json({ error: "Only pending orders can be confirmed" });
    }
    if (status === "pending" && !["confirmed", "cancelled"].includes(order.status)) {
      return res.status(400).json({ error: "Only confirmed or cancelled orders can return to pending" });
    }

    // Get order items FIRST (before updating status)
    const orderItems = await db
      .select()
      .from(storefrontOrderItems)
      .where(eq(storefrontOrderItems.orderId, orderId));

    // Handle inventory status changes BEFORE updating order status
    if (status === "cancelled") {
      // Return items to available when order is cancelled
      for (const item of orderItems) {
        if (item.eventInventoryId) {
          await db
            .update(eventInventory)
            .set({ status: "available" })
            .where(eq(eventInventory.id, item.eventInventoryId));
        }
      }
    } else if (status === "pending" && order.status === "cancelled") {
      // Reopen cancelled order - set items back to reserved
      for (const item of orderItems) {
        if (item.eventInventoryId) {
          await db
            .update(eventInventory)
            .set({ status: "reserved" })
            .where(eq(eventInventory.id, item.eventInventoryId));
        }
      }
    }
    // Note: When undoing confirmed -> pending, items stay reserved (no change needed)

    // Handle order completion - create sales transactions
    if (status === "completed" && order.status === "confirmed") {
      console.log(`💰 Creating sales transactions for completed order ${orderId}`);
      
      // Find or match the contact by email
      let buyerContactId: string | null = null;
      if (order.customerEmail) {
        const [existingContact] = await db
          .select()
          .from(contacts)
          .where(and(
            eq(contacts.userId, userId),
            eq(contacts.email, order.customerEmail)
          ))
          .limit(1);
        
        if (existingContact) {
          buyerContactId = existingContact.id;
          console.log(`👤 Found existing contact: ${existingContact.name} (${buyerContactId})`);
        }
      }
      
      // Create sales transaction for each order item
      for (const item of orderItems) {
        if (item.eventInventoryId) {
          // Get the inventory item to find global_asset_id
          const [inventoryItem] = await db
            .select()
            .from(eventInventory)
            .where(eq(eventInventory.id, item.eventInventoryId))
            .limit(1);
          
          if (inventoryItem && inventoryItem.globalAssetId) {
            const saleId = uuidv4();
            await db
              .insert(salesTransactions)
              .values({
                id: saleId,
                userId,
                globalAssetId: inventoryItem.globalAssetId,
                transactionType: "event_sale",
                eventId: order.eventId,
                eventInventoryId: item.eventInventoryId,
                orderId: orderId,
                buyerId: buyerContactId,
                buyerName: order.customerName,
                buyerEmail: order.customerEmail,
                buyerPhone: order.customerPhone || null,
                salePrice: String(item.price),
                paymentMethod: "digital", // Default to digital for storefront orders
                saleDate: new Date(),
                createdAt: new Date(),
              });
            
            // Update inventory to sold
            await db
              .update(eventInventory)
              .set({ 
                status: "sold",
                updatedAt: new Date(),
              })
              .where(eq(eventInventory.id, item.eventInventoryId));
            
            console.log(`✅ Created sale transaction ${saleId} for inventory ${item.eventInventoryId}`);
          }
        }
      }
    }

    // Update order status AFTER inventory changes
    const updateData: any = { status };
    
    // Set timestamps based on status changes
    if (status === "confirmed" && order.status === "pending") {
      updateData.contactedAt = new Date();
    } else if (status === "pending" && order.status === "confirmed") {
      // Undo confirmation - clear contactedAt timestamp
      updateData.contactedAt = null;
    } else if (status === "pending" && order.status === "cancelled") {
      // Reopen cancelled order - clear cancelledAt timestamp
      updateData.cancelledAt = null;
    } else if (status === "completed") {
      updateData.completedAt = new Date();
    } else if (status === "cancelled") {
      updateData.cancelledAt = new Date();
    }

    await db
      .update(storefrontOrders)
      .set(updateData)
      .where(eq(storefrontOrders.id, orderId));

    console.log(`📋 Updated order ${orderId} status: ${order.status} → ${status}`);

    res.json({ success: true, orderId, status });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});

export default router;