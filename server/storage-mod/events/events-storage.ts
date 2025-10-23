import { BaseStorage } from "../base/base-storage";
import type { IEventsStorage } from "./types";
import { events, salesTransactions, purchaseTransactions, cardShows } from "@shared/schema";
import { sql, eq, ilike, or, and, gte, desc } from "drizzle-orm";

export class EventsStorage extends BaseStorage implements IEventsStorage {
  async createEvent(event: any): Promise<any> {
    const normalized: any = { ...event };
    if (normalized.aiInsights && !Array.isArray(normalized.aiInsights)) {
      normalized.aiInsights = Array.from(normalized.aiInsights as any);
    }
    const [newEvent] = await this.db
      .insert(events)
      .values(normalized as any)
      .returning();
    return newEvent;
  }

  async getEventsByUserId(userId: string, archived?: boolean): Promise<any[]> {
    const archivedFilter = archived !== undefined ? `AND e.archived = ${archived}` : '';
    
    // Raw SQL query with correlated subqueries for transaction stats
    // This approach avoids Drizzle ORM issues with table interpolation in subqueries
    const query = sql`
      SELECT 
        e.id,
        e.user_id,
        e.name,
        e.location,
        e.date_start,
        e.date_end,
        e.description,
        e.logo_url,
        e.ai_insights,
        e.status,
        e.is_custom,
        e.card_show_id,
        e.archived,
        e.storefront_enabled,
        e.storefront_qr_code_url,
        e.storefront_last_generated_at,
        e.created_at,
        e.updated_at,
        -- Sales stats (revenue)
        (
          SELECT CAST(COUNT(DISTINCT st.id) AS INTEGER)
          FROM sales_transactions st
          WHERE st.event_id = e.id
        ) as sold_count,
        (
          SELECT CAST(COALESCE(SUM(st.sale_price), 0) AS NUMERIC(10,2))
          FROM sales_transactions st
          WHERE st.event_id = e.id
        ) as revenue,
        -- Purchase stats (costs)
        (
          SELECT CAST(COUNT(DISTINCT pt.id) AS INTEGER)
          FROM purchase_transactions pt
          WHERE pt.event_id = e.id
        ) as purchased_count,
        (
          SELECT CAST(COALESCE(SUM(pt.purchase_price), 0) AS NUMERIC(10,2))
          FROM purchase_transactions pt
          WHERE pt.event_id = e.id
        ) as purchased_total
      FROM events e
      WHERE e.user_id = ${userId} ${sql.raw(archivedFilter)}
      ORDER BY e.date_start DESC
    `;

    const userEvents = await this.db.execute(query);
    
    // Map snake_case to camelCase and convert types
    const normalizedEvents = (userEvents.rows || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      location: row.location,
      dateStart: row.date_start,
      dateEnd: row.date_end,
      description: row.description,
      logoUrl: row.logo_url,
      aiInsights: row.ai_insights,
      status: row.status,
      isCustom: row.is_custom,
      cardShowId: row.card_show_id,
      archived: row.archived,
      storefrontEnabled: row.storefront_enabled,
      storefrontQrCodeUrl: row.storefront_qr_code_url,
      storefrontLastGeneratedAt: row.storefront_last_generated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      soldCount: parseInt(row.sold_count as any) || 0,
      revenue: parseFloat(row.revenue as any) || 0,
      purchasedCount: parseInt(row.purchased_count as any) || 0,
      purchasedTotal: parseFloat(row.purchased_total as any) || 0,
    }));
    
    return normalizedEvents;
  }

  async getEvent(id: string): Promise<any | undefined> {
    const [event] = await this.db
      .select()
      .from(events)
      .where(eq(events.id, id));
    return event || undefined;
  }

  async updateEvent(id: string, eventData: any): Promise<any> {
    const updateData: any = { ...eventData, updatedAt: new Date() };
    if (updateData.aiInsights && !Array.isArray(updateData.aiInsights)) {
      updateData.aiInsights = Array.from(updateData.aiInsights as any);
    }

    const [updatedEvent] = await this.db
      .update(events)
      .set(updateData as any)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: string): Promise<void> {
    await this.db
      .delete(events)
      .where(eq(events.id, id));
  }

  async archiveEvent(id: string): Promise<any> {
    const [archived] = await this.db
      .update(events)
      .set({ archived: true, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return archived;
  }

  async unarchiveEvent(id: string): Promise<any> {
    const [unarchived] = await this.db
      .update(events)
      .set({ archived: false, updatedAt: new Date() })
      .where(eq(events.id, id))
      .returning();
    return unarchived;
  }

  async getEventsSummary(userId: string): Promise<{ totalEvents: number; totalBuyOffers: number; totalSold: number; totalRevenue: number; totalProfit: number; }> {
    // Get active events count (non-archived)
    const userEvents = await this.getEventsByUserId(userId, false);
    
    // Get sales stats in one clean query
    const [salesStats] = await this.db
      .select({
        totalSold: sql<number>`COUNT(DISTINCT ${salesTransactions.id})`,
        totalRevenue: sql<number>`COALESCE(SUM(${salesTransactions.salePrice}), 0)`,
        totalProfit: sql<number>`COALESCE(SUM(${salesTransactions.profit}), 0)`,
      })
      .from(salesTransactions)
      .innerJoin(events, eq(salesTransactions.eventId, events.id))
      .where(sql`${events.userId} = ${userId} AND ${events.archived} = false`);
    
    return {
      totalEvents: userEvents.length,
      totalBuyOffers: 0, // Not implemented yet
      totalSold: Number(salesStats?.totalSold || 0),
      totalRevenue: Number(salesStats?.totalRevenue || 0),
      totalProfit: Number(salesStats?.totalProfit || 0),
    };
  }

  // Card shows: database search implementation
  async searchCardShows(query: string, limit: number = 50): Promise<any[]> {
    const shows = await this.db
      .select()
      .from(cardShows)
      .where(
        and(
          eq(cardShows.isActive, true),
          or(
            ilike(cardShows.name, `%${query}%`),
            ilike(cardShows.city, `%${query}%`),
            ilike(cardShows.state, `%${query}%`),
            ilike(cardShows.venueName, `%${query}%`)
          )
        )
      )
      .orderBy(desc(cardShows.dateStart))
      .limit(limit);
    
    return shows;
  }
  
  async getUpcomingCardShows(limit: number = 50): Promise<any[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const shows = await this.db
      .select()
      .from(cardShows)
      .where(
        and(
          eq(cardShows.isActive, true),
          gte(cardShows.dateStart, today)
        )
      )
      .orderBy(cardShows.dateStart)
      .limit(limit);
    
    return shows;
  }
  
  async bulkInsertCardShows(shows: any[]): Promise<any[]> {
    if (shows.length === 0) return [];
    
    const inserted = await this.db
      .insert(cardShows)
      .values(shows)
      .onConflictDoNothing()
      .returning();
    
    return inserted;
  }
}
