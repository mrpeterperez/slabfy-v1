import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../../storage-mod/registry";
import { authenticateUser, validateUserAccess, AuthenticatedRequest, uploadAvatar, deleteAvatar, uploadCollectionImage, uploadEventLogo, validateAvatarFile, uploadAssetImage } from "../../supabase";
import multer from "multer";
import { updateUserCollectionsSchema, usernameSchema, updateProfileSchema, patchProfileSchema, userAssets, globalAssets, insertUserAssetSchema, consignments, consignmentAssets } from "@shared/schema";
import { v4 as uuidv4 } from "uuid";
import { db } from "../../db";
import { eq, and, sql, notInArray, desc, isNotNull, isNull } from "drizzle-orm";
import { triggerAssetCreationRefresh } from "../helpers/assetCreationRefresh";
import { generateCardId } from "../helpers/cardIdGenerator";
import { isUsernameReserved, getReservedUsernameMessage } from "@shared/reserved-usernames";

const router = Router();

// Configure multer for memory storage (files will be uploaded to Supabase)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// HEAD /api/user/:userId/exists
router.head("/:userId/exists", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    return user ? res.status(200).end() : res.status(404).end();
  } catch (error) {
    console.error("Error checking user existence:", error);
    return res.status(500).end();
  }
});

// GET /api/user/:userId
router.get("/:userId", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/user/by-email/:email
router.get("/by-email/:email", async (req: Request, res: Response) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await storage.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/user/:userId/collections
router.post("/:userId/collections", authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const validatedData = updateUserCollectionsSchema.parse(req.body);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const updatedUser = await storage.updateUserCollections(userId, validatedData.collections);
    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error("Error updating user collections:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Failed to update user collections", details: errorMessage });
  }
});

// POST /api/user/:userId/onboarding
router.post("/:userId/onboarding", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { completed } = req.body as { completed?: boolean };
    if (typeof completed !== "boolean") return res.status(400).json({ error: "Completed status must be a boolean" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const updatedUser = await storage.updateOnboardingStatus(userId, completed);
    return res.json(updatedUser);
  } catch (error) {
    console.error("Error updating onboarding status:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Failed to update onboarding status", details: errorMessage });
  }
});

// POST /api/username/check (kept under /api root in original; we’ll keep it grouped here and mount at /api)
// REMOVED: Duplicate username endpoint - handled in server/routes/public/index.ts

// PATCH /api/user/:userId/username
router.patch("/:userId/username", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { username } = req.body as { username?: string };
    if (!username || typeof username !== "string") return res.status(400).json({ error: "Username is required" });
    const validationResult = usernameSchema.safeParse(username);
    if (!validationResult.success) return res.status(400).json({ error: "Invalid username format", details: validationResult.error.errors });
    
    // Check if username is reserved
    if (isUsernameReserved(username)) {
      return res.status(400).json({ 
        error: getReservedUsernameMessage(username)
      });
    }
    
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const updatedUser = await storage.updateUsername(userId, username);
    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof Error && error.message === "Username already taken") return res.status(400).json({ error: "Username already taken" });
    console.error("Error updating username:", error);
    return res.status(500).json({ error: "Failed to update username" });
  }
});

// GET /api/user/:userId/profile
router.get("/:userId/profile", authenticateUser, validateUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const profile = { name: user.name, bio: user.bio, avatarUrl: user.avatarUrl };
    return res.json(profile);
  } catch (error) {
    console.error("Error retrieving user profile:", error);
    return res.status(500).json({ error: "Failed to retrieve user profile" });
  }
});

// PUT /api/user/:userId/profile
router.put("/:userId/profile", authenticateUser, validateUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const validatedData = updateProfileSchema.parse(req.body);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const updatedUser = await storage.updateUserProfile(userId, validatedData);
    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error("Error updating user profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return res.status(500).json({ error: "Failed to update user profile", details: errorMessage });
  }
});

// PATCH /api/user/:userId/profile
router.patch("/:userId/profile", authenticateUser, validateUserAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const validatedData = patchProfileSchema.parse(req.body);
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const updatedUser = await storage.updateUserProfile(userId, validatedData);
    return res.json(updatedUser);
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: error.errors });
    console.error("Error patching user profile:", error);
    return res.status(500).json({ error: "Failed to update user profile" });
  }
});

// POST /api/user/:userId/avatar
router.post("/:userId/avatar", authenticateUser, upload.single('avatar'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const authenticatedUserId = req.user?.id;
    if (authenticatedUserId !== userId) return res.status(403).json({ error: "You can only update your own avatar" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const validation = validateAvatarFile(req.file);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
    if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
    if (user.avatarUrl && user.avatarUrl.includes('supabase.co')) await deleteAvatar(user.avatarUrl);
    const avatarUrl = await uploadAvatar(req.file.buffer, userId, req.file.originalname);
    const updatedUser = await storage.updateUserProfile(userId, { avatarUrl });
    return res.json({ avatarUrl: updatedUser.avatarUrl });
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return res.status(500).json({ error: "Failed to upload avatar" });
  }
});

// POST /api/user/:userId/collection-thumbnail
router.post("/:userId/collection-thumbnail", authenticateUser, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const authenticatedUserId = req.user?.id;
    if (authenticatedUserId !== userId) return res.status(403).json({ error: "You can only upload images for your own collections" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const validation = validateAvatarFile(req.file);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
    if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
    const imageUrl = await uploadCollectionImage(req.file.buffer, userId, req.file.originalname);
    return res.json({ imageUrl });
  } catch (error) {
    console.error("Error uploading collection thumbnail:", error);
    return res.status(500).json({ error: "Failed to upload collection thumbnail" });
  }
});

// POST /api/user/:userId/event-logo
router.post("/:userId/event-logo", authenticateUser, upload.single('image'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const authenticatedUserId = req.user?.id;
    if (authenticatedUserId !== userId) return res.status(403).json({ error: "You can only upload images for your own events" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const validation = validateAvatarFile(req.file);
    if (!validation.isValid) return res.status(400).json({ error: validation.error });
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
    if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "File too large. Maximum size is 5MB." });
    const imageUrl = await uploadEventLogo(req.file.buffer, userId, req.file.originalname);
    return res.json({ imageUrl });
  } catch (error) {
    console.error("Error uploading event logo:", error);
    return res.status(500).json({ error: "Failed to upload event logo" });
  }
});

// DELETE /api/user/:userId/avatar
router.delete("/:userId/avatar", async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.avatarUrl && user.avatarUrl.includes('supabase.co')) await deleteAvatar(user.avatarUrl);
    await storage.updateUserProfile(userId, { avatarUrl: null });
    return res.json({ message: "Avatar deleted successfully" });
  } catch (error) {
    console.error("Error deleting avatar:", error);
    return res.status(500).json({ error: "Failed to delete avatar" });
  }
});

// POST /api/user/:userId/asset-images
router.post("/:userId/asset-images", authenticateUser, upload.single('image'), async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!req.file) return res.status(400).json({ error: "No image file provided" });

    const validation = validateAvatarFile(req.file); // reuse validation
    if (!validation.isValid) return res.status(400).json({ error: validation.error });
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
    if (req.file.size > 5 * 1024 * 1024) return res.status(400).json({ error: "File too large. Maximum size is 5MB." });

    const imageUrl = await uploadAssetImage(req.file.buffer, userId, req.file.originalname);
    return res.json({ imageUrl });
  } catch (error) {
    console.error("Error uploading asset image:", error);
    return res.status(500).json({ error: "Failed to upload asset image" });
  }
});

// GET /api/user/:userId/assets - Fetch user assets with global asset data (SECURE)
router.get("/:userId/assets", authenticateUser, validateUserAccess, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    console.log(`🔍 Fetching assets for user: ${userId}`);


    // Join user assets with global assets to get complete asset data
    // Include sold items in portfolio - don't filter by isActive, let frontend handle display
    const userAssetsQuery = db
      .select({
        // User asset fields  
        id: userAssets.id,
        userId: userAssets.userId,
        globalAssetId: userAssets.globalAssetId,
        purchasePrice: userAssets.purchasePrice,
        purchaseDate: userAssets.purchaseDate,
        purchaseSource: userAssets.purchaseSource,
        buyOfferId: userAssets.buyOfferId,
        serialNumber: userAssets.serialNumber,
        serialMax: userAssets.serialMax,
        serialNumbered: userAssets.serialNumbered,
        ownershipStatus: userAssets.ownershipStatus,
        soldAt: userAssets.soldAt,
        soldTo: userAssets.soldTo,
        soldPrice: userAssets.soldPrice,
        notes: userAssets.notes,
        addedAt: userAssets.addedAt,
        updatedAt: userAssets.updatedAt,
        // Global asset fields
        type: globalAssets.type,
        title: globalAssets.title,
        grader: globalAssets.grader,
        playerName: globalAssets.playerName,
        setName: globalAssets.setName,
        year: globalAssets.year,
        cardNumber: globalAssets.cardNumber,
        variant: globalAssets.variant,
        grade: globalAssets.grade,
        certNumber: globalAssets.certNumber,
        category: globalAssets.category,
        psaImageFrontUrl: globalAssets.psaImageFrontUrl,
        psaImageBackUrl: globalAssets.psaImageBackUrl,
        cardId: globalAssets.cardId,
        createdAt: globalAssets.createdAt,
        assetImages: globalAssets.assetImages
      })
      .from(userAssets)
      .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
      .where(and(eq(userAssets.userId, userId), eq(userAssets.isActive, true)));

    // Get consignment assets for this user
    const consignmentAssetsQuery = db
      .select({
        // Map consignment asset fields to match user asset structure
        id: consignmentAssets.id,
        userId: consignments.userId,
        globalAssetId: consignmentAssets.globalAssetId,
        consignmentId: consignmentAssets.consignmentId, // 🎯 CRITICAL: Include consignmentId for navigation
        purchasePrice: sql<number | null>`NULL`, // Consignment assets don't have purchase price
        purchaseDate: sql<string | null>`NULL`, // Consignment assets don't have purchase date
        serialNumber: sql<number | null>`NULL`, // Consignment assets don't track serial info
        serialMax: sql<number | null>`NULL`,
        serialNumbered: sql<boolean | null>`NULL`,
        ownershipStatus: sql<string>`'consignment'`, // Always consignment for these
        notes: consignmentAssets.notes,
        addedAt: consignmentAssets.addedAt,
        updatedAt: consignmentAssets.updatedAt,
        // Global asset fields
        type: globalAssets.type,
        title: globalAssets.title,
        grader: globalAssets.grader,
        playerName: globalAssets.playerName,
        setName: globalAssets.setName,
        year: globalAssets.year,
        cardNumber: globalAssets.cardNumber,
        variant: globalAssets.variant,
        grade: globalAssets.grade,
        certNumber: globalAssets.certNumber,
        category: globalAssets.category,
        psaImageFrontUrl: globalAssets.psaImageFrontUrl,
        psaImageBackUrl: globalAssets.psaImageBackUrl,
        cardId: globalAssets.cardId,
        createdAt: globalAssets.createdAt,
        assetImages: globalAssets.assetImages
      })
      .from(consignmentAssets)
      .innerJoin(consignments, eq(consignmentAssets.consignmentId, consignments.id))
      .innerJoin(globalAssets, eq(consignmentAssets.globalAssetId, globalAssets.id))
      .where(and(
        eq(consignments.userId, userId),
        eq(consignments.archived, false),
        sql`${consignments.status} IN ('active', 'paused')`,
        sql`LOWER(${consignmentAssets.status}) NOT IN ('sold', 'returned')`
      ));

    // Execute both queries
    const [userAssetsResults, consignmentAssetsResults] = await Promise.all([
      userAssetsQuery,
      consignmentAssetsQuery
    ]);

    // Combine and return results
    const allAssets = [...userAssetsResults, ...consignmentAssetsResults];

    console.log(`✅ Found ${userAssetsResults.length} user assets and ${consignmentAssetsResults.length} consignment assets for user ${userId}`);
    
    // Disable caching for portfolio data since it changes frequently with consignments
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    return res.json(allAssets);

  } catch (error) {
    console.error(`❌ Error fetching assets for user ${req.params.userId}:`, error);
    return res.status(500).json({ error: "Failed to fetch user assets" });
  }
});

// GET /api/user/:userId/assets/check-duplicate/:certNumber - Check for duplicate assets
router.get("/:userId/assets/check-duplicate/:certNumber", authenticateUser, validateUserAccess, async (req: Request, res: Response) => {
  try {
    const { userId, certNumber } = req.params;
    
    console.log(`🔍 Checking for duplicate cert ${certNumber} for user: ${userId}`);

    // Check if user already has an asset with this cert number
    const existingAsset = await db
      .select({
        userAssetId: userAssets.id,
        globalAssetId: userAssets.globalAssetId,
        title: globalAssets.title
      })
      .from(userAssets)
      .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
      .where(and(eq(userAssets.userId, userId), eq(globalAssets.certNumber, certNumber), eq(userAssets.isActive, true)))
      .limit(1);

    if (existingAsset.length > 0) {
      console.log(`⚠️ Found existing asset for cert ${certNumber}: ${existingAsset[0].userAssetId}`);
      return res.json({ 
        exists: true, 
        assetId: existingAsset[0].userAssetId,
        title: existingAsset[0].title
      });
    } else {
      console.log(`✅ No existing asset found for cert ${certNumber}`);
      return res.json({ exists: false });
    }

  } catch (error) {
    console.error(`❌ Error checking duplicate cert for user ${req.params.userId}:`, error);
    return res.status(500).json({ error: "Failed to check for duplicate assets" });
  }
});

// POST /api/user/:userId/assets - Add asset to user's portfolio
router.post("/:userId/assets", authenticateUser, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.params.userId;
    const authenticatedUserId = req.user?.id;
    
    // Ensure user can only add assets to their own portfolio
    if (authenticatedUserId !== userId) {
      return res.status(403).json({ error: "You can only add assets to your own portfolio" });
    }

    console.log(`🎯 Creating asset for user ${userId}:`, req.body);

    // First, create or get the global asset
    // Generate cardId from PSA metadata for sales data grouping
    let cardId = null;
    if (req.body.playerName && req.body.setName && req.body.year && req.body.grade) {
      try {
        cardId = generateCardId({
          playerName: req.body.playerName,
          setName: req.body.setName,
          year: req.body.year,
          grade: req.body.grade,
          cardNumber: req.body.cardNumber,
          variant: req.body.variant
        });
        console.log(`🔗 Generated cardId: ${cardId}`);
      } catch (error) {
        console.warn(`⚠️ Failed to generate cardId:`, error);
      }
    }

    const globalAssetData = {
      id: uuidv4(),
      type: req.body.type || 'graded',
      title: req.body.title,
      grader: req.body.grader || 'PSA',
      playerName: req.body.playerName,
      setName: req.body.setName,
      year: req.body.year,
      cardNumber: req.body.cardNumber,
      variant: req.body.variant,
      grade: req.body.grade,
      certNumber: req.body.certNumber,
      category: req.body.category,
      psaImageFrontUrl: req.body.psaImageFrontUrl,
      psaImageBackUrl: req.body.psaImageBackUrl,
      cardId: cardId,
    };

    // Insert or get existing global asset
    let globalAsset;
    if (req.body.certNumber) {
      // Check if global asset already exists for this cert number
      const [existingGlobalAsset] = await db
        .select()
        .from(globalAssets)
        .where(eq(globalAssets.certNumber, req.body.certNumber))
        .limit(1);

      if (existingGlobalAsset) {
        globalAsset = existingGlobalAsset;
        console.log(`♻️ Reusing existing global asset: ${globalAsset.id}`);
      } else {
        // Create new global asset
        [globalAsset] = await db.insert(globalAssets).values(globalAssetData).returning();
        console.log(`✨ Created new global asset: ${globalAsset.id}`);
      }
    } else {
      // No cert number, create new global asset
      [globalAsset] = await db.insert(globalAssets).values(globalAssetData).returning();
      console.log(`✨ Created new global asset (no cert): ${globalAsset.id}`);
    }

    // Now create the user asset
    // 🔄 AUTO-RECOVERY: Check if this cert was previously owned
    let autoRecoveredPurchasePrice = req.body.purchasePrice || null;
    let autoRecoveredPurchaseDate = req.body.purchaseDate || null;
    let autoRecoveredBuyOfferId = null;
    let recoverySource = '';
    
    if (req.body.certNumber && !req.body.purchasePrice) {
      // FIRST: Check for previously deleted user assets (most recent)
      // IMPORTANT: Exclude sold items (soldAt != null) - sold = complete lifecycle, fresh start on re-add
      const [deletedAsset] = await db
        .select({
          purchasePrice: userAssets.purchasePrice,
          purchaseDate: userAssets.purchaseDate,
          buyOfferId: userAssets.buyOfferId,
          removedAt: userAssets.removedAt,
        })
        .from(userAssets)
        .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
        .where(
          and(
            eq(globalAssets.certNumber, req.body.certNumber),
            eq(userAssets.userId, userId),
            eq(userAssets.isActive, false), // Only check deleted assets
            isNull(userAssets.soldAt), // Skip sold items - they're a complete lifecycle
            isNotNull(userAssets.purchasePrice)
          )
        )
        .orderBy(desc(userAssets.removedAt))
        .limit(1);
      
      if (deletedAsset && deletedAsset.purchasePrice) {
        autoRecoveredPurchasePrice = deletedAsset.purchasePrice;
        autoRecoveredPurchaseDate = deletedAsset.purchaseDate;
        autoRecoveredBuyOfferId = deletedAsset.buyOfferId;
        recoverySource = 'previous asset';
        console.log(`🔄 Auto-recovered from previously deleted asset: $${deletedAsset.purchasePrice}`);
      } else {
        // SECOND: Try buy session history if no deleted asset found
        const { buyListCart } = await import('@shared/schema');
        
        const [previousPurchase] = await db
          .select({
            offerPrice: buyListCart.offerPrice,
            addedAt: buyListCart.addedAt,
            buyOfferId: buyListCart.buyOfferId,
          })
          .from(buyListCart)
          .innerJoin(globalAssets, eq(buyListCart.assetId, globalAssets.id))
          .where(eq(globalAssets.certNumber, req.body.certNumber))
          .orderBy(desc(buyListCart.addedAt))
          .limit(1);
        
        if (previousPurchase && previousPurchase.offerPrice) {
          autoRecoveredPurchasePrice = previousPurchase.offerPrice;
          autoRecoveredPurchaseDate = previousPurchase.addedAt;
          autoRecoveredBuyOfferId = previousPurchase.buyOfferId;
          recoverySource = 'buy session';
          console.log(`🔄 Auto-recovered from buy session: $${previousPurchase.offerPrice} (buy offer: ${previousPurchase.buyOfferId})`);
        }
      }
    }

    const userAssetData = {
      id: uuidv4(),
      userId: userId,
      globalAssetId: globalAsset.id,
      purchasePrice: autoRecoveredPurchasePrice,
      purchaseDate: autoRecoveredPurchaseDate,
      buyOfferId: autoRecoveredBuyOfferId,
      serialNumber: req.body.serialNumber || null,
      serialMax: req.body.serialMax || null,
      serialNumbered: req.body.serialNumbered || false,
      ownershipStatus: req.body.ownershipStatus || 'own',
      notes: req.body.notes || null,
    };

    const [userAsset] = await db.insert(userAssets).values(userAssetData).returning();
    
    console.log(`🎉 Created user asset: ${userAsset.id} for global asset: ${globalAsset.id}`);

    // 🚀 Trigger background sales refresh for the newly created asset
    triggerAssetCreationRefresh(globalAsset.id, { type: 'user' });

    // Return the user asset ID for cache invalidation
    return res.status(201).json({
      id: userAsset.id,
      userAssetId: userAsset.id, 
      globalAssetId: globalAsset.id,
      message: "Asset added successfully"
    });

  } catch (error) {
    console.error("Error creating user asset:", error);
    return res.status(500).json({ error: "Failed to create asset" });
  }
});

export default router;
