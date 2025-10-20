import express, { Response } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db } from "../../db";
import { 
  buyOffers, 
  buyListCart, 
  globalAssets,
  userAssets,
  salesTransactions,
  purchaseTransactions,
  events,
  sellers,
  contacts,
} from "@shared/schema";
import { AuthenticatedRequest } from "../../supabase";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { scheduleSalesRefresh } from "../helpers/controllers/refreshController";
import { addSaleToGlobalHistory } from "../../helpers/salesHistoryWriter";

const router = express.Router();

// Enhanced checkout finalize schema - require critical fields for production
const finalizeCheckoutSchema = z.object({
  paymentMethod: z.enum(["cash", "check", "digital", "trade"]).default("cash"),
  amountPaid: z.number().min(0),
  buyerName: z.string().min(1, "Buyer name is required"),
  notes: z.string().optional(),
});

// POST /sessions/:id/checkout/finalize - Finalize checkout and return receipt
router.post("/sessions/:id/checkout/finalize", async (req: AuthenticatedRequest, res: Response) => {
  let transactionId: string | undefined;
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    const sessionId = req.params.id;
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Parse and validate request body
    const body = finalizeCheckoutSchema.parse(req.body ?? {});
    transactionId = uuidv4(); // For comprehensive logging
    
    console.log(`🏪 [Transaction ${transactionId}] Starting checkout finalization for session ${sessionId}, user ${userId}`);

    // Verify session ownership and get session details with status check
    const session = await db
      .select({ 
        id: buyOffers.id, 
        offerNumber: buyOffers.offerNumber, 
        status: buyOffers.status,
        eventId: buyOffers.eventId,
        sellerId: buyOffers.sellerId 
      })
      .from(buyOffers)
      .where(and(eq(buyOffers.id, sessionId), eq(buyOffers.userId, userId)))
      .limit(1);
      
    if (!session.length) {
      console.log(`❌ [Transaction ${transactionId}] Session not found: ${sessionId}`);
      return res.status(404).json({ error: "Session not found" });
    }
    
    const sessionData = session[0];
    
    // IDEMPOTENCY PROTECTION: Check if session is already processed
    if (sessionData.status === 'closed') {
      console.log(`⚠️ [Transaction ${transactionId}] Session already processed with status: ${sessionData.status}`);
      return res.status(409).json({ 
        error: "Session already processed", 
        status: sessionData.status,
        sessionNumber: sessionData.offerNumber 
      });
    }

    // Get all cart items with asset details for processing
    const cartItems = await db
      .select({
        id: buyListCart.id,
        assetId: buyListCart.assetId,
        offerPrice: buyListCart.offerPrice,
        notes: buyListCart.notes,
      })
      .from(buyListCart)
      .where(eq(buyListCart.buyOfferId, sessionId));

    // IDEMPOTENCY PROTECTION: Check cart emptiness
    if (!cartItems.length) {
      console.log(`⚠️ [Transaction ${transactionId}] Cart is empty for session ${sessionId}`);
      return res.status(400).json({ 
        error: "No items in cart to process", 
        hint: "Cart may have been already processed or cleared" 
      });
    }

    const total = cartItems.reduce((sum, item) => sum + (parseFloat(item.offerPrice || '0') || 0), 0);
    console.log(`💰 [Transaction ${transactionId}] Processing ${cartItems.length} items, total: $${total}`);

    // Get seller contact information if seller exists on session
    let sellerContactId: string | null = null;
    let sellerName: string | null = null;
    
    if (sessionData.sellerId) {
      const sellerInfo = await db
        .select({
          contactId: sellers.contactId,
          contactName: contacts.name,
        })
        .from(sellers)
        .leftJoin(contacts, eq(sellers.contactId, contacts.id))
        .where(eq(sellers.id, sessionData.sellerId))
        .limit(1);
      
      if (sellerInfo.length > 0 && sellerInfo[0].contactId) {
        sellerContactId = sellerInfo[0].contactId;
        sellerName = sellerInfo[0].contactName || "Unknown Seller";
        console.log(`👤 [Transaction ${transactionId}] Seller: ${sellerName} (Contact ID: ${sellerContactId})`);
      }
    }

    // Validate payment amount
    if (body.amountPaid < total) {
      console.log(`❌ [Transaction ${transactionId}] Payment insufficient: paid $${body.amountPaid}, required $${total}`);
      return res.status(400).json({ 
        error: "Payment amount insufficient", 
        required: total, 
        provided: body.amountPaid 
      });
    }

    // ATOMIC TRANSACTION: All operations succeed or all fail
    const result = await db.transaction(async (tx) => {
      // STEP 1: Ensure we have a "Buying Desk Transactions" event (deterministic per user)
      let finalEventId = sessionData.eventId;
      if (!finalEventId) {
        const defaultEventName = 'Buying Desk Transactions';
        console.log(`🎪 [Transaction ${transactionId}] Creating/reusing event: ${defaultEventName}`);
        
        const existingEvent = await tx
          .select({ id: events.id })
          .from(events)
          .where(and(
            eq(events.userId, userId),
            eq(events.name, defaultEventName)
          ))
          .limit(1);
        
        if (existingEvent.length > 0) {
          finalEventId = existingEvent[0].id;
          console.log(`♻️ [Transaction ${transactionId}] Reusing existing event: ${finalEventId}`);
        } else {
          const eventId = uuidv4();
          const today = new Date().toISOString().split('T')[0];
          const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          const [newEvent] = await tx
            .insert(events)
            .values({
              id: eventId,
              userId: userId,
              name: defaultEventName,
              description: 'Auto-created event for buying desk transactions',
              status: 'active',
              location: 'Buying Desk',
              dateStart: today,
              dateEnd: nextYear,
            })
            .returning();
          finalEventId = newEvent.id;
          console.log(`✨ [Transaction ${transactionId}] Created new event: ${finalEventId}`);
        }
      }

      const createdUserAssets: string[] = [];
      const createdPurchaseTransactions: string[] = [];
      const processedAssets: string[] = [];

      // STEP 2: Process each cart item atomically
      for (let index = 0; index < cartItems.length; index++) {
        const item = cartItems[index];
        const itemTransactionId = uuidv4();
        console.log(`📦 [Transaction ${transactionId}] Processing item ${index + 1}/${cartItems.length}: ${item.assetId}`);
        
        try {
          // Get the global asset information
          const globalAssetResult = await tx
            .select({
              id: globalAssets.id,
              cardId: globalAssets.cardId, // For sales history grouping
              title: globalAssets.title,
              playerName: globalAssets.playerName,
              setName: globalAssets.setName,
              year: globalAssets.year,
              grade: globalAssets.grade,
              certNumber: globalAssets.certNumber,
              psaImageFrontUrl: globalAssets.psaImageFrontUrl, // For sales history image
            })
            .from(globalAssets)
            .where(eq(globalAssets.id, item.assetId))
            .limit(1);

          if (!globalAssetResult.length) {
            const error = `Global asset not found for cart item ${item.id}: asset ${item.assetId}`;
            console.error(`❌ [Transaction ${transactionId}] ${error}`);
            throw new Error(error);
          }

          const globalAsset = globalAssetResult[0];
          const purchasePrice = parseFloat(item.offerPrice || '0') || 0;
          const assetDisplay = globalAsset.title || `${globalAsset.playerName || 'Unknown'} ${globalAsset.setName || ''} ${globalAsset.year || ''} ${globalAsset.grade || ''}`;
          
          // Capture market price at time of purchase
          let marketPriceAtPurchase = 0;
          try {
            const { calculatePricing } = await import('../helpers/controllers/pricingController');
            // Use the controller via mock req/res to preserve signature
            const mockReq = { params: { cardId: item.assetId } } as any;
            let pricingData: any = null;
            const mockRes = {
              json: (data: any) => { pricingData = data; },
              status: (code: number) => ({ json: (data: any) => { pricingData = { ...data, statusCode: code }; } })
            } as any;
            await calculatePricing(mockReq, mockRes);
            marketPriceAtPurchase = parseFloat(String(pricingData?.averagePrice)) || 0;
          } catch (pricingError) {
            console.warn(`⚠️ [Transaction ${transactionId}] Could not fetch market price for ${item.assetId}:`, pricingError);
          }
          
          // STEP 2A: Create user asset - The buyer now owns this asset
          const userAssetId = uuidv4();
          await tx
            .insert(userAssets)
            .values({
              id: userAssetId,
              userId: userId, // The person buying the asset
              globalAssetId: item.assetId,
              purchasePrice: purchasePrice.toString(),
              purchaseDate: new Date().toISOString().split('T')[0], // Today's date
              purchaseSource: 'SlabFy', // Mark as SlabFy buying desk purchase
              buyOfferId: sessionId, // Link to buying desk session for read-only UI
              personalValue: purchasePrice.toString(), // Set initial value to purchase price
              marketPriceAtPurchase: marketPriceAtPurchase.toString(), // Market price at time of purchase
              ownershipStatus: 'own', // They own it outright
              status: 'Active', // Active in their portfolio
              notes: item.notes || `Purchased via Buying Desk - Session ${sessionData.offerNumber}`,
              isActive: true,
              addedAt: new Date(),
              updatedAt: new Date(),
            });
          
          createdUserAssets.push(userAssetId);
          console.log(`🏷️ [Transaction ${transactionId}] Created user asset ${userAssetId} for ${assetDisplay} - $${purchasePrice}`);
          
          // STEP 2B: Create purchaseTransaction record for buying desk purchases
          // This tracks when the user buys cards from others
          await tx
            .insert(purchaseTransactions)
            .values({
              id: itemTransactionId,
              userId: userId, // Required: The buyer (authenticated user)
              eventId: finalEventId, // Optional: Event context
              buyOfferId: sessionId, // Links to buying desk session
              globalAssetId: item.assetId, // Required: Asset being purchased
              userAssetId: userAssetId, // Reference to the created user asset
              
              // Purchase details
              purchasePrice: purchasePrice.toString(), // Required: Price paid
              paymentMethod: body.paymentMethod, // Required: Payment method
              
              // Seller information (who we bought from)
              sellerName: sellerName || "Unknown Seller", // Seller name from session
              sellerContactId: sellerContactId, // Link to contact if available
              
              // Market context
              marketPriceAtPurchase: marketPriceAtPurchase.toString(), // Market price when purchased
              
              // Metadata
              notes: item.notes || `Buying Desk Purchase - Session ${sessionData.offerNumber}`,
              purchaseDate: new Date(), // Required: When the purchase occurred
            });
          
          createdPurchaseTransactions.push(itemTransactionId);
          processedAssets.push(assetDisplay);
          const realizedProfit = marketPriceAtPurchase - purchasePrice;
          console.log(`💰 [Transaction ${transactionId}] Created sales transaction ${itemTransactionId} for ${assetDisplay} - $${purchasePrice}`);
          console.log(`📈 [Transaction ${transactionId}] Realized profit calculated: Market $${marketPriceAtPurchase} - Purchase $${purchasePrice} = $${realizedProfit.toFixed(2)}`);
          
          // STEP 2C: Add to global sales history for pricing intelligence
          // This adds internal Slabfy sales to the global marketplace data
          try {
            const saleResult = await addSaleToGlobalHistory({
              globalAssetId: item.assetId,
              cardId: globalAsset.cardId || undefined, // Use global_asset's card_id for proper grouping
              title: assetDisplay,
              finalPrice: purchasePrice,
              saleDate: new Date(),
              paymentMethod: body.paymentMethod, // 'cash', 'check', 'digital', 'trade'
              sellerName: "Slabfy Dealer", // Anonymous seller for privacy
              userId: userId, // PRIVATE: for analytics only
              userAssetId: userAssetId,
              eventId: finalEventId,
              notes: `Buying Desk - Session ${sessionData.offerNumber}`,
              psaImageUrl: globalAsset.psaImageFrontUrl || undefined, // PSA front image for display
            });
            
            if (saleResult.success && !saleResult.isDuplicate) {
              console.log(`🌐 [Transaction ${transactionId}] Added to global sales history: ${saleResult.saleId}`);
            } else if (saleResult.isDuplicate) {
              console.log(`⚠️ [Transaction ${transactionId}] Sale already in global history (duplicate)`);
            } else {
              console.warn(`⚠️ [Transaction ${transactionId}] Failed to add to global sales history: ${saleResult.error}`);
            }
          } catch (salesHistoryError) {
            // Don't fail the transaction if sales history fails - it's supplementary data
            console.error(`❌ [Transaction ${transactionId}] Error adding to global sales history:`, salesHistoryError);
          }
          
        } catch (itemError) {
          console.error(`❌ [Transaction ${transactionId}] Error processing cart item ${item.id}:`, itemError);
          throw new Error(`Failed to process item ${index + 1}: ${itemError instanceof Error ? itemError.message : String(itemError)}`);
        }
      }

      // STEP 3: Clear cart after successful processing (critical for atomicity)
      const deletedCartItems = await tx
        .delete(buyListCart)
        .where(eq(buyListCart.buyOfferId, sessionId))
        .returning({ id: buyListCart.id });
      
      console.log(`🗑️ [Transaction ${transactionId}] Cleared ${deletedCartItems.length} cart items`);

      // STEP 4: Update session status to 'closed' as completed transaction
      const [updatedSession] = await tx
        .update(buyOffers)
        .set({ 
          status: 'closed', 
          updatedAt: new Date(), 
          sentAt: new Date() 
        })
        .where(eq(buyOffers.id, sessionId))
        .returning({ id: buyOffers.id, status: buyOffers.status });
      
      console.log(`✅ [Transaction ${transactionId}] Updated session status to: ${updatedSession.status}`);
      
      // STEP 5: Return transaction summary for verification
      return {
        transactionId,
        eventId: finalEventId,
        userAssets: createdUserAssets,
        purchaseTransactions: createdPurchaseTransactions,
        processedAssets,
        cartItemsCleared: deletedCartItems.length,
        sessionStatus: updatedSession.status,
      };
    });

    // STEP 6: Schedule sales refresh for pricing updates (optional, non-blocking)
    for (const item of cartItems) {
      try {
        scheduleSalesRefresh(item.assetId, { delayMs: 1000, useAIFiltering: true }).catch(() => {
          console.warn(`⚠️ [Transaction ${transactionId}] Failed to schedule sales refresh for asset: ${item.assetId}`);
        });
      } catch (refreshError) {
        // Non-critical error, don't fail the transaction
        console.warn(`⚠️ [Transaction ${transactionId}] Sales refresh scheduling failed:`, refreshError);
      }
    }

    // Build comprehensive receipt response
    const receipt = {
      receiptId: uuidv4(),
      sessionId,
      sessionNumber: sessionData.offerNumber,
      transactionId: result.transactionId,
      total,
      paidAt: new Date().toISOString(),
      paymentMethod: body.paymentMethod,
      amountPaid: body.amountPaid,
      itemsProcessed: cartItems.length,
      eventId: result.eventId,
      userAssetsCreated: result.userAssets.length,
      purchaseTransactionsCreated: result.purchaseTransactions.length,
      processedAssets: result.processedAssets,
    };

    console.log(`🎉 [Transaction ${result.transactionId}] Buying desk checkout finalized successfully!`);
    console.log(`📊 [Transaction ${result.transactionId}] Summary: ${cartItems.length} assets, $${total} total, ${result.userAssets.length} user assets, ${result.purchaseTransactions.length} purchase records`);
    
    return res.status(201).json(receipt);
  } catch (error) {
    console.error(`❌ [Transaction ${transactionId || 'unknown'}] Error finalizing checkout:`, error);
    
    // Structured error handling for better debugging
    if (error instanceof z.ZodError) {
      console.error(`🔍 [Transaction ${transactionId || 'unknown'}] Validation error:`, error.errors);
      return res.status(400).json({ 
        error: "Invalid input", 
        details: error.errors,
        transactionId: transactionId || null
      });
    }
    
    // Database transaction errors
    if (error instanceof Error && error.message.includes('transaction')) {
      console.error(`🔄 [Transaction ${transactionId || 'unknown'}] Database transaction error:`, error.message);
      return res.status(500).json({ 
        error: "Transaction failed", 
        message: "All changes have been rolled back",
        transactionId: transactionId || null
      });
    }
    
    // Generic error with transaction ID for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error(`💥 [Transaction ${transactionId || 'unknown'}] Unexpected error:`, errorMessage);
    
    return res.status(500).json({ 
      error: "Failed to finalize checkout", 
      message: errorMessage,
      transactionId: transactionId || null
    });
  }
});

// PATCH /recalculate-profits - Recalculate expected profit for cart items missing this data
router.patch("/recalculate-profits", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;

    // Find all cart items with missing expected profit for this user
    const cartItems = await db
      .select({
        id: buyListCart.id,
        assetId: buyListCart.assetId,
        offerPrice: buyListCart.offerPrice,
        buyOfferId: buyListCart.buyOfferId,
      })
      .from(buyListCart)
      .innerJoin(buyOffers, eq(buyListCart.buyOfferId, buyOffers.id))
      .where(and(
        eq(buyOffers.userId, userId),
        sql`${buyListCart.expectedProfit} IS NULL OR CAST(${buyListCart.expectedProfit} AS DECIMAL) = 0`
      ));

    if (!cartItems.length) {
      return res.json({ message: "No cart items need profit recalculation", updated: 0 });
    }

    // Import pricing controller
    const { calculatePricing } = await import('../helpers/controllers/pricingController');
    
    let updated = 0;
    
    // Process each cart item
    for (const item of cartItems) {
      try {
        // Get market value for this asset
        const mockReq = { params: { cardId: item.assetId } };
        let pricingData: any = null;
        
        const mockRes = {
          json: (data: any) => { pricingData = data; },
          status: (code: number) => ({ json: (data: any) => { pricingData = { ...data, statusCode: code }; } })
        };
        
        await calculatePricing(mockReq as any, mockRes as any);
        
        if (pricingData && !pricingData.statusCode && pricingData.averagePrice) {
          const marketValue = parseFloat(String(pricingData.averagePrice)) || 0;
          const offerPrice = parseFloat(String(item.offerPrice)) || 0;
          const expectedProfit = marketValue - offerPrice;
          
          // Update the cart item with calculated values
          await db
            .update(buyListCart)
            .set({
              marketValueAtOffer: marketValue.toString(),
              expectedProfit: expectedProfit.toString(),
            })
            .where(eq(buyListCart.id, item.id));
          
          updated++;
        }
      } catch (itemError) {
        console.warn(`Failed to update profit for cart item ${item.id}:`, itemError);
      }
    }

    res.json({ message: `Recalculated expected profit for ${updated} cart items`, updated });
  } catch (error) {
    console.error("Error recalculating profits:", error);
    res.status(500).json({ error: "Failed to recalculate profits" });
  }
});

// DELETE /purchased/:assetId - Undo purchase by removing from user_assets and related sales_transactions
router.delete("/purchased/:assetId", async (req: any, res: any) => {
  try {
    const userId = req.user!.id;
    const assetId = req.params.assetId;

    if (!assetId) {
      return res.status(400).json({ error: "Asset ID is required" });
    }

    // Start transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // 1) Find the user asset to verify ownership and get purchase info
      const userAssetRows = await tx
        .select({
          id: userAssets.id,
          globalAssetId: userAssets.globalAssetId,
          purchasePrice: userAssets.purchasePrice,
          notes: userAssets.notes,
        })
        .from(userAssets)
        .where(and(
          eq(userAssets.userId, userId),
          eq(userAssets.globalAssetId, assetId),
          eq(userAssets.isActive, true),
          eq(userAssets.ownershipStatus, 'own')
        ))
        .limit(1);

      if (!userAssetRows.length) {
        throw new Error("Purchased asset not found or not owned by user");
      }

      const userAsset = userAssetRows[0];

      // 2) Remove related purchase transactions first (be explicit about columns)
      // We created these in the purchaseTransactions table with: userId = userId,
      // userAssetId = created user asset, globalAssetId = assetId
      const deletedTransactions = await tx
        .delete(purchaseTransactions)
        .where(and(
          eq(purchaseTransactions.userId, userId),
          eq(purchaseTransactions.globalAssetId, assetId),
          eq(purchaseTransactions.userAssetId, userAsset.id)
        ))
        .returning({ id: purchaseTransactions.id });

      // 3) Remove from user_assets (will also cascade delete transactions if FK configured)
      const deletedUserAssets = await tx
        .delete(userAssets)
        .where(eq(userAssets.id, userAsset.id))
        .returning({ id: userAssets.id });

      // 4. Get asset details for response
      const assetDetails = await tx
        .select({
          id: globalAssets.id,
          playerName: globalAssets.playerName,
          setName: globalAssets.setName,
          year: globalAssets.year,
          cardNumber: globalAssets.cardNumber,
          grade: globalAssets.grade,
          certNumber: globalAssets.certNumber,
          cardId: globalAssets.cardId,
          type: globalAssets.type,
          grader: globalAssets.grader,
        })
        .from(globalAssets)
        .where(eq(globalAssets.id, assetId))
        .limit(1);

      return {
        deletedUserAssets,
        deletedTransactions,
        asset: assetDetails[0] || null,
        originalPurchasePrice: userAsset.purchasePrice,
      };
    });

    console.log(`🔄 Undo purchase completed for asset ${assetId} by user ${userId}`);
    
    res.json({
      message: "Purchase successfully undone",
      assetId,
      asset: result.asset,
      purchasePrice: result.originalPurchasePrice,
      userAssetsRemoved: result.deletedUserAssets.length,
      transactionsRemoved: result.deletedTransactions.length,
      undoneAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error undoing purchase:", error);
    
    if (error instanceof Error && error.message.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ 
      error: "Failed to undo purchase", 
      message: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

export default router;