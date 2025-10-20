import { Router } from 'express';
import { db } from '../db';
import { salesTransactions, purchaseTransactions, globalAssets, events, users, userAssets, contacts, buyers, buyOffers, sellers, eventInventory, salesHistory, userSalesLog } from '@shared/schema';
import { eq, and, desc, or, ilike, gte, lte, sql, type SQL, like, isNotNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { authenticateUser, type AuthenticatedRequest } from '../supabase';

const router = Router();

// Query schema for filters
const analyticsQuerySchema = z.object({
  type: z.enum(['sales', 'purchase', 'all']).optional().default('all'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  eventId: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
  offset: z.coerce.number().min(0).optional().default(0),
});

/**
 * GET /api/analytics/transactions
 * Unified endpoint for sales and purchase transaction analytics
 */
router.get('/transactions', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const query = analyticsQuerySchema.parse(req.query);
    
    // Build unified query using UNION ALL for proper pagination
    let salesQuery, purchaseQuery, manualSalesQuery;
    const baseConditions: SQL[] = [];
    
    // Add search filters to base conditions (database-level filtering)
    if (query.search) {
      const searchPattern = `%${query.search.toLowerCase()}%`;
      baseConditions.push(
        or(
          ilike(globalAssets.title, searchPattern),
          ilike(globalAssets.playerName, searchPattern),
          ilike(globalAssets.setName, searchPattern)
        )!
      );
    }

    // Sales query with proper joins
    if (query.type === 'all' || query.type === 'sales') {
      const salesConditions = [eq(salesTransactions.userId, userId), ...baseConditions];

      if (query.startDate) {
        salesConditions.push(gte(salesTransactions.saleDate, new Date(query.startDate)));
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        salesConditions.push(lte(salesTransactions.saleDate, endDate));
      }
      if (query.eventId) {
        salesConditions.push(eq(salesTransactions.eventId, query.eventId));
      }

      const buyerContacts = alias(contacts, 'buyer_contacts');
      const sellerContacts = alias(contacts, 'seller_contacts');

      salesQuery = db
        .select({
          id: salesTransactions.id,
          type: sql<string>`'sales'`.as('type'),
          date: salesTransactions.saleDate,
          amount: salesTransactions.salePrice,
          paymentMethod: salesTransactions.paymentMethod,
          contactId: buyerContacts.id,
          contactName: sql<string>`COALESCE(${buyerContacts.name}, ${salesTransactions.buyerName})`.as('contactName'),
          contactEmail: buyerContacts.email,
          contactPhone: buyerContacts.phone,
          contactType: sql<string>`'buyer'`.as('contactType'),
          eventId: salesTransactions.eventId,
          eventName: events.name,
          buyingSessionId: sql<string>`NULL`.as('buyingSessionId'),
          notes: salesTransactions.notes,
          profit: salesTransactions.profit,
          listPrice: eventInventory.askingPrice, // List price from inventory
          marketPriceAtSale: salesTransactions.marketPriceAtSale, // Market price at time of sale
          costBasis: salesTransactions.costBasis,
          sellerName: sellerContacts.name, // Seller information
          sellerEmail: sellerContacts.email,
          sellerPhone: sellerContacts.phone,
          status: sql<string>`'completed'`.as('status'), // Sales are completed by definition
          assetTitle: globalAssets.title,
          assetPlayerName: globalAssets.playerName,
          assetSetName: globalAssets.setName,
          assetYear: globalAssets.year,
          assetGrade: globalAssets.grade,
        })
        .from(salesTransactions)
        .innerJoin(globalAssets, eq(salesTransactions.globalAssetId, globalAssets.id))
        .leftJoin(events, eq(salesTransactions.eventId, events.id))
        .leftJoin(eventInventory, eq(salesTransactions.eventInventoryId, eventInventory.id))
        .leftJoin(buyers, eq(salesTransactions.buyerId, buyers.id))
        .leftJoin(buyerContacts, eq(buyers.contactId, buyerContacts.id))
        .leftJoin(sellers, eq(salesTransactions.sellerId, sellers.id))
        .leftJoin(sellerContacts, eq(sellers.contactId, sellerContacts.id))
        .where(and(...salesConditions));
    }

    // Manual sales query from user_sales_log (personal "Sold It" transactions)
    if (query.type === 'all' || query.type === 'sales') {
      const manualSalesConditions = [eq(userSalesLog.userId, userId), ...baseConditions];

      if (query.startDate) {
        manualSalesConditions.push(gte(userSalesLog.saleDate, new Date(query.startDate)));
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        manualSalesConditions.push(lte(userSalesLog.saleDate, endDate));
      }
      // Manual sales don't have eventId, so skip that filter

      manualSalesQuery = db
        .select({
          id: userSalesLog.id,
          type: sql<string>`'sales'`.as('type'),
          date: userSalesLog.saleDate,
          amount: userSalesLog.salePrice,
          paymentMethod: userSalesLog.platform, // Platform becomes payment method
          contactId: sql<string>`NULL`.as('contactId'),
          contactName: sql<string>`NULL`.as('contactName'),
          contactEmail: sql<string>`NULL`.as('contactEmail'),
          contactPhone: sql<string>`NULL`.as('contactPhone'),
          contactType: sql<string>`NULL`.as('contactType'),
          eventId: sql<string>`NULL`.as('eventId'),
          eventName: sql<string>`'Personal Sale'`.as('eventName'), // Mark as personal sale
          buyingSessionId: sql<string>`NULL`.as('buyingSessionId'),
          notes: userSalesLog.notes,
          profit: userSalesLog.profit,
          listPrice: sql<string>`NULL`.as('listPrice'),
          marketPriceAtSale: sql<string>`NULL`.as('marketPriceAtSale'),
          costBasis: userSalesLog.purchasePrice, // Purchase price is cost basis
          sellerName: sql<string>`NULL`.as('sellerName'),
          sellerEmail: sql<string>`NULL`.as('sellerEmail'),
          sellerPhone: sql<string>`NULL`.as('sellerPhone'),
          status: sql<string>`'completed'`.as('status'),
          assetTitle: globalAssets.title,
          assetPlayerName: globalAssets.playerName,
          assetSetName: globalAssets.setName,
          assetYear: globalAssets.year,
          assetGrade: globalAssets.grade,
        })
        .from(userSalesLog)
        .innerJoin(globalAssets, eq(userSalesLog.globalAssetId, globalAssets.id))
        .where(and(...manualSalesConditions));
    }

    // Purchase query with proper joins
    if (query.type === 'all' || query.type === 'purchase') {
      const purchaseConditions = [eq(purchaseTransactions.userId, userId), ...baseConditions];

      if (query.startDate) {
        purchaseConditions.push(gte(purchaseTransactions.purchaseDate, new Date(query.startDate)));
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        endDate.setHours(23, 59, 59, 999);
        purchaseConditions.push(lte(purchaseTransactions.purchaseDate, endDate));
      }
      if (query.eventId) {
        purchaseConditions.push(eq(purchaseTransactions.eventId, query.eventId));
      }

      const sessionMatches = alias(buyOffers, 'matched_sessions');
      const sellerRecords = alias(sellers, 'matched_sellers');
      const sessionContacts = alias(contacts, 'session_contacts');

      purchaseQuery = db
        .select({
          id: purchaseTransactions.id,
          type: sql<string>`'purchase'`.as('type'),
          date: purchaseTransactions.purchaseDate,
          amount: purchaseTransactions.purchasePrice,
          paymentMethod: purchaseTransactions.paymentMethod,
          contactId: sql<string>`COALESCE(${contacts.id}, ${sessionContacts.id})`.as('contactId'),
          contactName: sql<string>`COALESCE(${contacts.name}, ${sessionContacts.name}, ${purchaseTransactions.sellerName})`.as('contactName'),
          contactEmail: sql<string>`COALESCE(${contacts.email}, ${sessionContacts.email})`.as('contactEmail'),
          contactPhone: sql<string>`COALESCE(${contacts.phone}, ${sessionContacts.phone})`.as('contactPhone'),
          contactType: sql<string>`'seller'`.as('contactType'),
          eventId: purchaseTransactions.eventId,
          eventName: events.name,
          buyingSessionId: sessionMatches.id,
          notes: purchaseTransactions.notes,
          profit: sql<string>`NULL`.as('profit'),
          assetTitle: globalAssets.title,
          assetPlayerName: globalAssets.playerName,
          assetSetName: globalAssets.setName,
          assetYear: globalAssets.year,
          assetGrade: globalAssets.grade,
        })
        .from(purchaseTransactions)
        .innerJoin(globalAssets, eq(purchaseTransactions.globalAssetId, globalAssets.id))
        .leftJoin(events, eq(purchaseTransactions.eventId, events.id))
        .leftJoin(contacts, eq(purchaseTransactions.sellerContactId, contacts.id))
        .leftJoin(sessionMatches, sql`${purchaseTransactions.notes} LIKE ('%Session ' || ${sessionMatches.offerNumber} || '%')`)
        .leftJoin(sellerRecords, eq(sessionMatches.sellerId, sellerRecords.id))
        .leftJoin(sessionContacts, eq(sellerRecords.contactId, sessionContacts.id))
        .where(and(...purchaseConditions));
    }

    // Execute queries and combine results
    let allTransactions: any[] = [];
    let totalCount = 0;
    
    if (query.type === 'all' || query.type === 'sales') {
      if (salesQuery) {
        const salesResults = await salesQuery.orderBy(desc(salesTransactions.saleDate));
        allTransactions.push(...salesResults);
      }
      // Add manual sales from user_sales_log
      if (manualSalesQuery) {
        const manualSalesResults = await manualSalesQuery.orderBy(desc(userSalesLog.saleDate));
        allTransactions.push(...manualSalesResults);
      }
    }

    if (query.type === 'all' || query.type === 'purchase') {
      if (purchaseQuery) {
        const purchaseResults = await purchaseQuery.orderBy(desc(purchaseTransactions.purchaseDate));
        allTransactions.push(...purchaseResults);
      }
    }

    // Sort combined results by date
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Get total count before pagination
    totalCount = allTransactions.length;
    
    // Calculate summary metrics from ALL filtered transactions (before pagination)
    const salesTransactionsData = allTransactions.filter(t => t.type === 'sales');
    const purchaseTransactionsData = allTransactions.filter(t => t.type === 'purchase');
    
    const totalRevenue = salesTransactionsData.reduce((sum, t) => sum + Number(t.amount), 0);
    const totalSpent = purchaseTransactionsData.reduce((sum, t) => sum + Number(t.amount), 0);
    
    const summary = {
      totalSales: salesTransactionsData.length,
      totalPurchases: purchaseTransactionsData.length,
      totalRevenue,
      totalSpent,
      netProfit: totalRevenue - totalSpent,
      transactionCount: allTransactions.length,
    };
    
    // Apply pagination AFTER calculating summary
    const transactions = allTransactions.slice(query.offset, query.offset + query.limit);

    res.json({
      transactions,
      summary,
      pagination: {
        limit: query.limit,
        offset: query.offset,
        total: Number(totalCount),
      }
    });

  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch analytics data' 
    });
  }
});

/**
 * GET /api/analytics/personal-sales
 * 
 * Fetches user's personal marketplace sales from user_sales_log (manual sales only)
 * These are unverified sales reported by the user - tracked for analytics only
 * NEVER affects public pricing or chart data (that's sales_history with verified sources)
 * 
 * Response:
 * {
 *   summary: {
 *     totalSales: number,
 *     totalProfit: number,
 *     avgMargin: number,
 *     bestSale: number
 *   },
 *   sales: [{...}]
 * }
 */
router.get('/personal-sales', authenticateUser, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    console.log(`📊 Fetching personal marketplace sales for user: ${userId}`);

    // Query user_sales_log with asset details
    const userSales = await db
      .select({
        // Sale record fields from user_sales_log
        saleId: userSalesLog.id,
        salePrice: userSalesLog.salePrice,
        platform: userSalesLog.platform,
        saleDate: userSalesLog.saleDate,
        
        // Purchase context from user_sales_log
        purchasePrice: userSalesLog.purchasePrice,
        purchaseDate: userSalesLog.purchaseDate,
        purchaseSource: userSalesLog.purchaseSource,
        
        // Pre-calculated metrics from user_sales_log
        profit: userSalesLog.profit,
        roi: userSalesLog.roi,
        
        // Optional details
        notes: userSalesLog.notes,
        
        // Asset details from global_assets
        assetTitle: globalAssets.title,
        certNumber: globalAssets.certNumber,
        category: globalAssets.category,
        psaImageFrontUrl: globalAssets.psaImageFrontUrl,
        playerName: globalAssets.playerName,
        setName: globalAssets.setName,
        year: globalAssets.year,
        grade: globalAssets.grade,
      })
      .from(userSalesLog)
      .innerJoin(globalAssets, eq(userSalesLog.globalAssetId, globalAssets.id))
      .where(eq(userSalesLog.userId, userId))
      .orderBy(desc(userSalesLog.saleDate));

    console.log(`📊 Found ${userSales.length} personal sales for user ${userId}`);

    // Format sales data for response
    const salesWithMetrics = userSales.map(sale => {
      const salePrice = parseFloat(sale.salePrice || '0');
      const purchasePrice = sale.purchasePrice ? parseFloat(sale.purchasePrice) : null;
      const profit = sale.profit ? parseFloat(sale.profit) : null;
      const roi = sale.roi ? parseFloat(sale.roi) : null;

      // Map platform to readable name (capitalize first letter)
      const platformMap: Record<string, string> = {
        'ebay': 'eBay',
        'in_person': 'In Person',
        'cash': 'Cash',
        'check': 'Check',
        'digital': 'Digital',
        'trade': 'Trade',
        'other': 'Other'
      };

      return {
        id: sale.saleId,
        assetTitle: sale.assetTitle || 'Unknown Asset',
        certNumber: sale.certNumber || 'N/A',
        purchasePrice: purchasePrice,
        salePrice: salePrice,
        platform: platformMap[sale.platform] || sale.platform,
        saleDate: sale.saleDate,
        profit: profit,
        roi: roi,
        category: sale.category || 'Unknown',
        psaImageFrontUrl: sale.psaImageFrontUrl,
        playerName: sale.playerName,
        setName: sale.setName,
        year: sale.year,
        grade: sale.grade,
        purchaseDate: sale.purchaseDate,
        purchaseSource: sale.purchaseSource,
        notes: sale.notes,
      };
    });

    // Calculate summary metrics
    const salesWithProfit = salesWithMetrics.filter(s => s.profit !== null);
    const totalSales = salesWithMetrics.length;
    const totalProfit = salesWithProfit.reduce((sum, s) => sum + (s.profit || 0), 0);
    const avgMargin = salesWithProfit.length > 0 
      ? salesWithProfit.reduce((sum, s) => sum + (s.roi || 0), 0) / salesWithProfit.length 
      : 0;
    const bestSale = salesWithProfit.length > 0 
      ? Math.max(...salesWithProfit.map(s => s.profit || 0)) 
      : 0;

    return res.json({
      summary: {
        totalSales,
        totalProfit: parseFloat(totalProfit.toFixed(2)),
        avgMargin: parseFloat(avgMargin.toFixed(2)),
        bestSale: parseFloat(bestSale.toFixed(2)),
        salesWithProfitData: salesWithProfit.length,
      },
      sales: salesWithMetrics,
    });

  } catch (error) {
    console.error(`❌ Error fetching personal sales analytics:`, error);
    return res.status(500).json({ error: "Failed to fetch personal sales data" });
  }
});

export { router as analyticsRouter };