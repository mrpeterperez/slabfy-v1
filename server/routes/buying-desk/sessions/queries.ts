// 🤖 INTERNAL NOTE:
// Purpose: Database queries for buying desk sessions and aggregates
// Exports: fetchSessionRows, fetchAggregates, SessionRow, CartAggregate, SessionAggregates
// Feature: buying-desk
// Dependencies: drizzle-orm, @shared/schema, ../../../db

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  buyListCart,
  buyOffers,
  contacts,
  evaluationAssets,
  events,
  sellers,
  type BuyOfferStatus,
} from "@shared/schema";

import { db } from "../../../db";

export interface SessionRow {
  id: string;
  offerNumber: string;
  eventId: string | null;
  notes: string | null;
  status: BuyOfferStatus;
  createdAt: Date;
  updatedAt: Date;
  eventName: string | null;
  eventLocation: string | null;
  sellerId: string | null;
  contactId: string | null;
  sellerName: string | null;
  sellerEmail: string | null;
  sellerPhone: string | null;
}

export interface CartAggregate {
  cartCount: number;
  totalValue: number;
  expectedProfit: number;
}



export interface SessionAggregates {
  evaluations: Map<string, number>;
  carts: Map<string, CartAggregate>;
}

export async function fetchSessionRows(userId: string, sessionId?: string, eventId?: string, archived?: boolean): Promise<SessionRow[]> {
  const conditions = [];
  conditions.push(eq(buyOffers.userId, userId));
  
  if (sessionId) {
    conditions.push(eq(buyOffers.id, sessionId));
  }
  
  if (eventId) {
    conditions.push(eq(buyOffers.eventId, eventId));
  }

  // Filter by archived status if provided
  if (archived !== undefined) {
    conditions.push(eq(buyOffers.archived, archived));
  }

  const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);

  const rows = await db
    .select({
      id: buyOffers.id,
      offerNumber: buyOffers.offerNumber,
      eventId: buyOffers.eventId,
      notes: buyOffers.notes,
      status: buyOffers.status,
      createdAt: buyOffers.createdAt,
      updatedAt: buyOffers.updatedAt,
      eventName: events.name,
      eventLocation: events.location,
      sellerId: buyOffers.sellerId,
      contactId: sellers.contactId,
      sellerName: contacts.name,
      sellerEmail: contacts.email,
      sellerPhone: contacts.phone,
    })
    .from(buyOffers)
    .leftJoin(events, eq(buyOffers.eventId, events.id))
    .leftJoin(sellers, eq(buyOffers.sellerId, sellers.id))
    .leftJoin(contacts, eq(sellers.contactId, contacts.id))
    .where(whereClause)
    .orderBy(desc(buyOffers.createdAt));
  
  if (eventId && rows.length > 0) {
    console.log(`🔍 [FETCH SESSION] Filtered by eventId=${eventId}, found ${rows.length} sessions`);
    console.log(`📋 [FETCH SESSION] First row eventId from DB: ${rows[0]?.eventId}`);
  }

  return rows as SessionRow[];
}

export async function fetchAggregates(sessionIds: string[]): Promise<SessionAggregates> {
  if (!sessionIds.length) {
    return { evaluations: new Map(), carts: new Map() };
  }

  const [evaluationRows, cartRows] = await Promise.all([
    db
      .select({
        buyOfferId: evaluationAssets.buyOfferId,
        evalCount: sql<number>`COUNT(${evaluationAssets.id})`,
      })
      .from(evaluationAssets)
      .where(inArray(evaluationAssets.buyOfferId, sessionIds))
      .groupBy(evaluationAssets.buyOfferId),
    db
      .select({
        buyOfferId: buyListCart.buyOfferId,
        cartCount: sql<number>`COUNT(${buyListCart.id})`,
        totalValue: sql<string>`COALESCE(SUM(${buyListCart.offerPrice}), 0)`,
        expectedProfit: sql<string>`COALESCE(SUM(${buyListCart.expectedProfit}), 0)`,
      })
      .from(buyListCart)
      .where(inArray(buyListCart.buyOfferId, sessionIds))
      .groupBy(buyListCart.buyOfferId),

  ]);

  const evaluations = new Map<string, number>();
  for (const row of evaluationRows) {
    evaluations.set(row.buyOfferId, Number(row.evalCount ?? 0));
  }

  const carts = new Map<string, CartAggregate>();
  for (const row of cartRows) {
    carts.set(row.buyOfferId, {
      cartCount: Number(row.cartCount ?? 0),
      totalValue: Number(row.totalValue ?? 0),
      expectedProfit: Number(row.expectedProfit ?? 0),
    });
  }

  return { evaluations, carts };
}
