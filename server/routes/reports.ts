// Global Reports API - Sales history and analytics across all events
import { Router } from 'express';
import { eq, desc, and, gte, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { salesTransactions, globalAssets, events, contacts, buyers } from '@shared/schema';
import { authenticateUser, type AuthenticatedRequest } from '../supabase';

const router = Router();

// Apply authentication to all routes
router.use(authenticateUser);

/**
 * @swagger
 * /api/reports/sales-history:
 *   get:
 *     summary: Get global sales history across all events
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of days to look back (omit for all time)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for assets, buyers, events
 *     responses:
 *       200:
 *         description: Sales history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   saleDate:
 *                     type: string
 *                     format: date-time
 *                   salePrice:
 *                     type: number
 *                   paymentMethod:
 *                     type: string
 *                   buyerName:
 *                     type: string
 *                   eventName:
 *                     type: string
 *                   assetTitle:
 *                     type: string
 *                   assetPlayerName:
 *                     type: string
 *                   assetSetName:
 *                     type: string
 *                   assetYear:
 *                     type: string
 *                   assetGrade:
 *                     type: string
 *                   profit:
 *                     type: number
 */
router.get('/sales-history', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { days, search } = req.query;

    // Build query conditions
    const conditions = [eq(salesTransactions.userId, userId)];

    // Add date filter if specified
    if (days && typeof days === 'string') {
      const daysNum = parseInt(days, 10);
      if (!isNaN(daysNum) && daysNum > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysNum);
        conditions.push(gte(salesTransactions.saleDate, cutoffDate));
      }
    }

    // Add search filter if specified
    let searchConditions = null;
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      searchConditions = sql`(
        LOWER(${globalAssets.playerName}) LIKE ${searchTerm} OR
        LOWER(${globalAssets.title}) LIKE ${searchTerm} OR
        LOWER(${globalAssets.setName}) LIKE ${searchTerm} OR
        LOWER(${events.name}) LIKE ${searchTerm} OR
        LOWER(${salesTransactions.buyerName}) LIKE ${searchTerm}
      )`;
    }

    const queryConditions = searchConditions 
      ? and(...conditions, searchConditions)
      : and(...conditions);

    const sales = await db
      .select({
        id: salesTransactions.id,
        saleDate: salesTransactions.saleDate,
        salePrice: salesTransactions.salePrice,
        paymentMethod: salesTransactions.paymentMethod,
        buyerName: salesTransactions.buyerName,
        profit: salesTransactions.profit,
        transactionType: salesTransactions.transactionType,
        // Event details
        eventName: events.name,
        // Asset details - handle both event sales and buying desk purchases  
        assetTitle: globalAssets.title,
        assetPlayerName: globalAssets.playerName,
        assetSetName: globalAssets.setName,
        assetYear: globalAssets.year,
        assetGrade: globalAssets.grade,
        assetCertNumber: globalAssets.certNumber,
      })
      .from(salesTransactions)
      .leftJoin(globalAssets, eq(salesTransactions.globalAssetId, globalAssets.id))
      .leftJoin(events, eq(salesTransactions.eventId, events.id))
      .where(queryConditions)
      .orderBy(desc(salesTransactions.saleDate));

    // Format the response - return null for missing dates instead of current date
    const formattedSales = sales.map(sale => ({
      id: sale.id,
      saleDate: sale.saleDate?.toISOString() || null, // Return null for missing dates
      salePrice: Number(sale.salePrice) || 0,
      paymentMethod: sale.paymentMethod || 'Unknown',
      buyerName: sale.buyerName,
      transactionType: sale.transactionType, // Include transaction type for debugging/filtering
      eventName: sale.eventName || (sale.transactionType === 'purchase' ? 'Buying Desk' : null),
      assetTitle: sale.assetTitle,
      assetPlayerName: sale.assetPlayerName,
      assetSetName: sale.assetSetName,
      assetYear: sale.assetYear,
      assetGrade: sale.assetGrade,
      profit: sale.profit ? Number(sale.profit) : null,
    }));

    console.log(`📊 Retrieved ${formattedSales.length} sales transactions for user ${userId}`);
    res.json(formattedSales);

  } catch (error) {
    console.error('Error fetching sales history:', error);
    res.status(500).json({ error: 'Failed to retrieve sales history' });
  }
});

/**
 * @swagger
 * /api/reports/summary:
 *   get:
 *     summary: Get sales summary analytics
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Number of days to look back (omit for all time)
 *     responses:
 *       200:
 *         description: Sales summary retrieved successfully
 */
router.get('/summary', async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });

    const { days } = req.query;

    // Build query conditions
    const conditions = [eq(salesTransactions.userId, userId)];

    // Add date filter if specified
    if (days && typeof days === 'string') {
      const daysNum = parseInt(days, 10);
      if (!isNaN(daysNum) && daysNum > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysNum);
        conditions.push(gte(salesTransactions.saleDate, cutoffDate));
      }
    }

    // Get basic sales metrics
    const salesMetrics = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(${salesTransactions.salePrice}), 0)`,
        totalSales: sql<number>`COUNT(*)`,
        averageSale: sql<number>`COALESCE(AVG(${salesTransactions.salePrice}), 0)`,
      })
      .from(salesTransactions)
      .where(and(...conditions))
      .then(rows => rows[0] || { totalRevenue: 0, totalSales: 0, averageSale: 0 });

    // Get top events by revenue
    const topEvents = await db
      .select({
        eventName: events.name,
        revenue: sql<number>`COALESCE(SUM(${salesTransactions.salePrice}), 0)`,
        salesCount: sql<number>`COUNT(*)`,
      })
      .from(salesTransactions)
      .leftJoin(events, eq(salesTransactions.eventId, events.id))
      .where(and(...conditions))
      .groupBy(events.id, events.name)
      .orderBy(desc(sql`SUM(${salesTransactions.salePrice})`))
      .limit(5);

    const summary = {
      totalRevenue: Number(salesMetrics.totalRevenue),
      totalSales: Number(salesMetrics.totalSales),
      averageSaleAmount: Number(salesMetrics.averageSale),
      topEvents: topEvents.map(event => ({
        eventName: event.eventName || 'Unknown Event',
        revenue: Number(event.revenue),
        salesCount: Number(event.salesCount),
      })),
    };

    res.json(summary);

  } catch (error) {
    console.error('Error fetching sales summary:', error);
    res.status(500).json({ error: 'Failed to retrieve sales summary' });
  }
});

export default router;