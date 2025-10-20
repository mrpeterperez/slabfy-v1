// 🤖 INTERNAL NOTE:
// Purpose: Coordinate buying desk session CRUD operations and data shaping
// Exports: listSessions, getSessionById, createSession, updateSession, deleteSession, SessionNumberGenerationError
// Feature: buying-desk
// Dependencies: drizzle-orm, uuid, @shared/schema, ../../../db, ./schemas, ./queries, ./mappers, ./session-number, ./types

import { and, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { buyOffers, contacts, sellers } from "@shared/schema";

import { db } from "../../../db";
import type { CreateSessionInput, UpdateSessionInput } from "./schemas";
import { fetchAggregates, fetchSessionRows } from "./queries";
import { generateSessionNumber } from "./session-number";
import { mapSession, normalizeId, normalizeText } from "./mappers";
import type { SessionSummary } from "./types";

const SESSION_NUMBER_ATTEMPTS = 5;

export class SessionNumberGenerationError extends Error {
  constructor() {
    super("Unable to generate unique session number");
  }
}

export async function listSessions(userId: string, eventId?: string, archived?: boolean): Promise<SessionSummary[]> {
  const rows = await fetchSessionRows(userId, undefined, eventId, archived);
  if (!rows.length) {
    return [];
  }

  const aggregates = await fetchAggregates(rows.map((row) => row.id));
  return rows.map((row) => mapSession(row, aggregates));
}

export async function getSessionById(
  userId: string,
  sessionId: string
): Promise<SessionSummary | null> {
  const rows = await fetchSessionRows(userId, sessionId);
  if (!rows.length) {
    return null;
  }

  const aggregates = await fetchAggregates(rows.map((row) => row.id));
  return mapSession(rows[0], aggregates);
}

export async function createSession(
  userId: string,
  payload: CreateSessionInput
): Promise<SessionSummary> {
  // Handle contactId by creating/finding a seller relationship
  let finalSellerId = normalizeId(payload.sellerId);
  
  if (payload.contactId && !payload.sellerId) {
    // Check if a seller relationship already exists for this contact
    const existingSeller = await db
      .select({ id: sellers.id })
      .from(sellers)
      .where(and(eq(sellers.contactId, payload.contactId), eq(sellers.userId, userId)))
      .limit(1);
    
    if (existingSeller.length > 0) {
      finalSellerId = existingSeller[0].id;
    } else {
      // Create a new seller relationship for this contact
      const [newSeller] = await db
        .insert(sellers)
        .values({
          id: uuidv4(),
          contactId: payload.contactId,
          userId,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: sellers.id });
      
      if (!newSeller) {
        throw new Error("Failed to create seller relationship");
      }
      
      finalSellerId = newSeller.id;
    }
  }

  for (let attempt = 0; attempt < SESSION_NUMBER_ATTEMPTS; attempt += 1) {
    const sessionNumber = await generateSessionNumber();
    const now = new Date();
    
    const finalEventId = normalizeId(payload.eventId);
    console.log(`💾 [CREATE SESSION] Inserting with eventId: ${finalEventId}`);

    try {
      const [inserted] = await db
        .insert(buyOffers)
        .values({
          id: uuidv4(),
          userId,
          offerNumber: sessionNumber,
          sellerId: finalSellerId,
          eventId: finalEventId,
          notes: normalizeText(payload.notes),
          status: "active", // Simplified status - active by default
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: buyOffers.id });

      if (!inserted) {
        throw new Error("Failed to create buy session");
      }
      
      console.log(`✅ [CREATE SESSION] Inserted session ${inserted.id}, fetching full data...`);

      const session = await getSessionById(userId, inserted.id);
      if (!session) {
        throw new Error("Unable to load created session");
      }
      
      console.log(`📊 [CREATE SESSION] Loaded session - eventId in response: ${session.eventId}`);

      return session;
    } catch (error) {
      if (isUniqueViolation(error)) {
        continue;
      }

      throw error;
    }
  }

  throw new SessionNumberGenerationError();
}

export async function updateSession(
  userId: string,
  sessionId: string,
  payload: UpdateSessionInput
): Promise<SessionSummary | null> {
  const [existing] = await db
    .select({ id: buyOffers.id })
    .from(buyOffers)
    .where(and(eq(buyOffers.id, sessionId), eq(buyOffers.userId, userId)))
    .limit(1);

  if (!existing) {
    return null;
  }

  const updates: Partial<typeof buyOffers.$inferInsert> = {};

  if (payload.notes !== undefined) {
    updates.notes = normalizeText(payload.notes);
  }

  if (payload.status !== undefined) {
    updates.status = payload.status;
    
    // Auto-archive when status changes to 'closed'
    if (payload.status === 'closed') {
      updates.archived = true;
    }
  }

  if (payload.sellerId !== undefined) {
    updates.sellerId = normalizeId(payload.sellerId);
  }

  if (payload.eventId !== undefined) {
    updates.eventId = normalizeId(payload.eventId);
  }

  if (Object.keys(updates).length) {
    updates.updatedAt = new Date();

    await db
      .update(buyOffers)
      .set(updates)
      .where(eq(buyOffers.id, sessionId));
  }

  const session = await getSessionById(userId, sessionId);
  if (!session) {
    throw new Error("Session disappeared after update");
  }

  return session;
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  await db
    .delete(buyOffers)
    .where(and(eq(buyOffers.id, sessionId), eq(buyOffers.userId, userId)));
}

function isUniqueViolation(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && (error as { code?: string }).code === "23505");
}
