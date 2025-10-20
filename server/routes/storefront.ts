// 🤖 INTERNAL NOTE:
// Purpose: Express router handling Show Storefront settings, analytics, cart holds, and buying desk
// Exports: default router instance with storefront routes
// Feature: sales-channels/show-storefront
// Dependencies: express Router, zod, ../storage, ../supabase, @shared/schema

import { Router, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { db } from "../db";
import { eventInventory } from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  insertStorefrontSettingsSchema, 
  updateStorefrontSettingsSchema,
  insertEventStorefrontSettingsSchema,
  updateEventStorefrontSettingsSchema,
  insertStorefrontCartHoldSchema
} from "@shared/schema";
import { authenticateUser, type AuthenticatedRequest } from "../supabase";

const router = Router();

// ============================================
// PUBLIC ENDPOINTS - No authentication required
// ============================================

/**
 * @swagger
 * /api/storefront/settings/user/{userId}:
 *   get:
 *     summary: Get public storefront settings by user ID
 *     tags: [Show Storefront - Public]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Public storefront settings retrieved successfully
 */
router.get("/settings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = await storage.getStorefrontSettings(userId);
    
    if (!settings) {
      res.status(404).json({ error: "Storefront not found" });
      return;
    }
    
    res.json(settings);
  } catch (error) {
    console.error("Error fetching public storefront settings:", error);
    res.status(500).json({ error: "Failed to fetch storefront settings" });
  }
});

/**
 * @swagger
 * /api/storefront/inventory/user/{userId}:
 *   get:
 *     summary: Get public inventory for a user's storefront
 *     tags: [Show Storefront - Public]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: sport
 *         schema:
 *           type: string
 *       - in: query
 *         name: minGrade
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Public inventory retrieved successfully
 */
router.get("/inventory/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { search, sport, minGrade } = req.query;
    
    // Get all user assets using proper storage method
    const assets = await storage.getAssetsByUserId(userId);
    
    // Apply search/filters
    let filteredAssets = assets;
    
    if (search && typeof search === 'string') {
      const searchLower = search.toLowerCase();
      filteredAssets = filteredAssets.filter(asset => 
        asset.playerName?.toLowerCase().includes(searchLower) ||
        asset.setName?.toLowerCase().includes(searchLower) ||
        asset.year?.toString().includes(searchLower)
      );
    }
    
    if (sport && typeof sport === 'string') {
      filteredAssets = filteredAssets.filter(asset => 
        asset.category?.toLowerCase() === sport.toLowerCase()
      );
    }
    
    if (minGrade && typeof minGrade === 'string') {
      const grade = parseFloat(minGrade);
      filteredAssets = filteredAssets.filter(asset => 
        asset.grade && parseFloat(asset.grade) >= grade
      );
    }
    
    res.json(filteredAssets);
  } catch (error) {
    console.error("Error fetching public inventory:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

/**
 * @swagger
 * /api/storefront/cart/submit:
 *   post:
 *     summary: Submit cart hold request (public)
 *     tags: [Show Storefront - Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Cart hold request submitted successfully
 */
router.post("/cart/submit", async (req, res) => {
  try {
    const { userId, customerName, customerEmail, customerPhone, items } = req.body;
    
    // Create cart hold records for each item
    const holdRecords = items.map((item: any) => ({
      userId,
      assetId: item.assetId,
      customerName,
      customerEmail,
      customerPhone,
      status: 'pending' as const,
      holdExpiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
    }));

    // Save to database (using first item's data for now - we'll batch this later)
    if (holdRecords.length > 0) {
      await storage.createCartHold(holdRecords[0]);
    }

    // Generate order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

    res.status(201).json({ 
      success: true, 
      orderId,
      message: "Cart hold request submitted successfully" 
    });
  } catch (error) {
    console.error("Error submitting cart:", error);
    res.status(500).json({ error: "Failed to submit cart hold request" });
  }
});

/**
 * @swagger
 * /api/storefront/orders:
 *   post:
 *     summary: Submit customer order from checkout (public)
 *     tags: [Show Storefront - Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - customerName
 *               - customerEmail
 *               - cartItems
 *             properties:
 *               userId:
 *                 type: string
 *               eventId:
 *                 type: string
 *               customerName:
 *                 type: string
 *               customerEmail:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               cartItems:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     price:
 *                       type: number
 *                     eventInventoryId:
 *                       type: string
 *     responses:
 *       201:
 *         description: Order created successfully
 */
router.post("/orders", async (req, res) => {
  try {
    // Validate required fields
    const { userId, eventId, customerName, customerEmail, customerPhone, cartItems } = req.body ?? {};

    if (!userId || !customerName || !customerEmail || !cartItems || cartItems.length === 0) {
      res.status(400).json({
        error: "Invalid order data",
        details: "Missing required fields: userId, customerName, customerEmail, and cartItems"
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      res.status(400).json({
        error: "Invalid email address"
      });
      return;
    }

    // 🔥 SMART CONTACT MATCHING - Find or create contact based on email
    // NOTE: This creates/finds contacts in the background for seller's benefit
    // The order itself stores customer info directly (customerName, customerEmail, customerPhone)
    // So even if contact matching fails, the order still has all necessary customer data
    let contactId: string | null = null;
    const normalizedEmail = customerEmail.trim().toLowerCase();
    
    try {
      // Check if contact with this email already exists for this seller
      const existingContacts = await storage.getContactsByUserId(userId);
      const matchedContact = existingContacts.find(
        (c) => c.email?.toLowerCase() === normalizedEmail && !c.archived
      );
      
      if (matchedContact) {
        // ✅ Found existing contact - use it (preserves full name like "Peter Perez Jr")
        contactId = matchedContact.id;
        console.log(`🔗 Linked order to existing contact: ${matchedContact.name} (${matchedContact.email})`);
      } else {
        // ✨ New contact - create with buyer's input
        try {
          const newContact = await storage.createContact({
            userId,
            name: customerName.trim(),
            email: normalizedEmail,
            phone: customerPhone?.trim() || null,
            companyName: null,
            notes: null,
          });
          contactId = newContact.id;
          console.log(`➕ Created new contact: ${newContact.name} (${newContact.email})`);
        } catch (createError: any) {
          // Handle duplicate email race condition
          if (createError?.message === "DUPLICATE_EMAIL") {
            console.log(`⚡ Race condition detected - contact was just created. Fetching existing contact...`);
            const refetchedContacts = await storage.getContactsByUserId(userId);
            const existingContact = refetchedContacts.find(
              (c) => c.email?.toLowerCase() === normalizedEmail && !c.archived
            );
            if (existingContact) {
              contactId = existingContact.id;
              console.log(`🔗 Linked to existing contact after race condition: ${existingContact.name}`);
            } else {
              console.error("⚠️ Could not find contact after duplicate error - proceeding without contact link");
            }
          } else {
            throw createError; // Re-throw if it's not a duplicate email error
          }
        }
      }
    } catch (contactError) {
      // If contact matching fails completely, log but don't block order
      console.error("⚠️ Contact matching failed (non-blocking):", contactError);
    }

    // Calculate total amount and item count
    const totalAmount = cartItems.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
    const itemCount = cartItems.length;

    // Create order using storage method
    const orderData = {
      userId,
      eventId: eventId || null,
      customerName,
      customerEmail,
      customerPhone: customerPhone || null,
      totalAmount,
      itemCount,
      status: "pending" as const,
      notes: null,
      contactedAt: null,
      completedAt: null,
      cancelledAt: null
    };

    let order;
    try {
      order = await storage.createStorefrontOrder(orderData);
    } catch (err) {
      console.error("Failed to create order:", err);
      throw err;
    }

    // Create order items and update inventory status
    const orderItems = [] as any[];
    for (const item of cartItems) {
      // 🔥 STOREFRONT FIX: Frontend sends event_inventory.id, not user_asset.id
      // We need to lookup event_inventory to get globalAssetId
      if (!item.eventInventoryId) {
        console.error(`⚠️ Missing eventInventoryId for cart item - skipping`);
        continue;
      }

      // Get the event inventory item to extract globalAssetId
      const [inventoryItem] = await db
        .select()
        .from(eventInventory)
        .where(eq(eventInventory.id, item.eventInventoryId));
      
      if (!inventoryItem || !inventoryItem.globalAssetId) {
        console.error(`⚠️ Event inventory ${item.eventInventoryId} not found or missing globalAssetId - skipping`);
        continue;
      }

      const orderItemData = {
        orderId: order.id,
        globalAssetId: inventoryItem.globalAssetId, // ✅ Get from event_inventory
        eventInventoryId: item.eventInventoryId,
        price: Number(item.price) || 0
      };
      try {
        const orderItem = await storage.createStorefrontOrderItem(orderItemData);
        orderItems.push(orderItem);
        
        // 🔥 UPDATE INVENTORY STATUS TO RESERVED
        await db
          .update(eventInventory)
          .set({ status: 'reserved' })
          .where(eq(eventInventory.id, item.eventInventoryId));
        console.log(`📦 Reserved inventory item ${item.eventInventoryId} for order ${order.id}`);
      } catch (err) {
        console.error("Failed to create order item:", err);
        throw err;
      }
    }

    console.log(`✅ Created ${orderItems.length} order items`);
    console.log("🎉 Order created successfully!");

    // Return success response
    res.status(201).json({
      success: true,
      orderId: order.id,
      order,
      items: orderItems,
      contactId, // Include contact ID in response for reference
    });

    // TODO: Send email notification to dealer
    console.log("📧 TODO: Send email notification to dealer");

  } catch (error) {
    console.error("❌ Error creating storefront order:", error);
    res.status(500).json({
      error: "Failed to create order",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Apply authentication to all routes below using Supabase JWT validation
router.use(authenticateUser);

const requireUserId = (req: AuthenticatedRequest, res: Response): string | undefined => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return undefined;
  }
  return userId;
};

// ============================================
// STOREFRONT SETTINGS - Global Configuration
// ============================================

/**
 * @swagger
 * /api/storefront/settings:
 *   get:
 *     summary: Get storefront settings for current user
 *     tags: [Show Storefront]
 *     responses:
 *       200:
 *         description: Storefront settings retrieved successfully
 */
router.get("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const settings = await storage.getStorefrontSettings(userId);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching storefront settings:", error);
    res.status(500).json({ error: "Failed to fetch storefront settings" });
  }
});

/**
 * @swagger
 * /api/storefront/settings:
 *   post:
 *     summary: Create storefront settings
 *     tags: [Show Storefront]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Storefront settings created successfully
 */
router.post("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    // Default template values with dynamic placeholders
    const defaults = {
      storeName: "My Card Show Collection",
      description: "Premium graded cards and collectibles at <show-title>. Sports, Pokemon, TCG and more.",
      welcomeMessage: "Welcome To <show-title>",
      eventDateText: "<show-date>",
      eventLocationText: "<show-location>",
    };

    const validated = insertStorefrontSettingsSchema.parse({
      ...defaults,
      ...req.body,
      userId,
    });

    const created = await storage.createStorefrontSettings(validated);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request data", details: error.errors });
      return;
    }
    console.error("Error creating storefront settings:", error);
    res.status(500).json({ error: "Failed to create storefront settings" });
  }
});

/**
 * @swagger
 * /api/storefront/settings:
 *   put:
 *     summary: Update storefront settings
 *     tags: [Show Storefront]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Storefront settings updated successfully
 */
router.put("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const validated = updateStorefrontSettingsSchema.parse(req.body);
    const updated = await storage.updateStorefrontSettings(userId, validated);
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request data", details: error.errors });
      return;
    }
    console.error("Error updating storefront settings:", error);
    res.status(500).json({ error: "Failed to update storefront settings" });
  }
});

// ============================================
// EVENT STOREFRONT SETTINGS - Per-Event Overrides
// ============================================

/**
 * @swagger
 * /api/storefront/events/{eventId}/settings:
 *   get:
 *     summary: Get event-specific storefront settings
 *     tags: [Show Storefront]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event storefront settings retrieved successfully
 */
router.get("/events/:eventId/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { eventId } = req.params;
    const settings = await storage.getEventStorefrontSettings(eventId);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching event storefront settings:", error);
    res.status(500).json({ error: "Failed to fetch event storefront settings" });
  }
});

/**
 * @swagger
 * /api/storefront/events/{eventId}/settings:
 *   post:
 *     summary: Create event-specific storefront settings
 *     tags: [Show Storefront]
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Event storefront settings created successfully
 */
router.post("/events/:eventId/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = requireUserId(req, res);
    if (!userId) return;

    const { eventId } = req.params;
    const validated = insertEventStorefrontSettingsSchema.parse({
      ...req.body,
      eventId,
      userId,
    });

    const created = await storage.createEventStorefrontSettings(validated);
    res.status(201).json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid request data", details: error.errors });
      return;
    }
    console.error("Error creating event storefront settings:", error);
    res.status(500).json({ error: "Failed to create event storefront settings" });
  }
});

export default router;
