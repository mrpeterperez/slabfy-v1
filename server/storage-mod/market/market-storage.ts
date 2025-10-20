import { BaseStorage } from "../base/base-storage";
import type { IMarketStorage } from "./types";
import { salesHistory, salesFetches, type SalesHistory, type InsertSalesHistory, type InsertSalesFetch } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import crypto from "crypto";

export class MarketStorage extends BaseStorage implements IMarketStorage {
  // Return sales records for a normalized card identifier, newest first
  async getSalesRecords(cardIdentifier: string): Promise<SalesHistory[]> {
    const rows = await this.db
      .select()
      .from(salesHistory)
      .where(eq(salesHistory.card_id, cardIdentifier))
      .orderBy(sql`${salesHistory.sold_date} DESC`);
    return rows as SalesHistory[];
  }

  // Create a new sales record
  async createSalesRecord(record: InsertSalesHistory): Promise<SalesHistory> {
    const recordWithId = { id: crypto.randomUUID(), ...record } as any;
    const [row] = await this.db
      .insert(salesHistory)
      .values(recordWithId)
      .returning();
    return row as SalesHistory;
  }

  // Get last fetch metadata for this card identifier
  async getSalesFetch(cardIdentifier: string): Promise<any> {
    const [row] = await this.db
      .select()
      .from(salesFetches)
      .where(eq(salesFetches.cardIdentifier, cardIdentifier))
      .limit(1);
    return row || null;
  }

  // Upsert fetch metadata (by unique cardIdentifier)
  async upsertSalesFetch(data: Partial<InsertSalesFetch> & { cardIdentifier: string }): Promise<any> {
    const existing = await this.getSalesFetch(data.cardIdentifier);
    if (existing) {
      const [updated] = await this.db
        .update(salesFetches)
        .set({ ...existing, ...data, updatedAt: new Date() } as any)
        .where(eq(salesFetches.cardIdentifier, data.cardIdentifier))
        .returning();
      return updated;
    }
    const insertValues: any = {
      cardIdentifier: data.cardIdentifier,
      lastFetchAt: (data as any).lastFetchAt ?? new Date(),
      lastSaleDate: (data as any).lastSaleDate ?? null,
      refreshCount: (data as any).refreshCount ?? 1,
      marketActivity: (data as any).marketActivity ?? 'unknown',
      apiCallsToday: (data as any).apiCallsToday ?? 1,
      lastApiCallDate: (data as any).lastApiCallDate ?? new Date(),
      totalSalesFound: (data as any).totalSalesFound ?? 0,
    };
    const [inserted] = await this.db
      .insert(salesFetches)
      .values(insertValues)
      .returning();
    return inserted;
  }
}
