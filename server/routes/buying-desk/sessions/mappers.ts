// 🤖 INTERNAL NOTE:
// Purpose: Transform buying desk session rows into API responses and helpers
// Exports: mapSession, normalizeText, normalizeId
// Feature: buying-desk
// Dependencies: ./queries, ./types

import type { SessionAggregates, SessionRow } from "./queries";
import type { SessionSummary } from "./types";

const UNKNOWN_EVENT_NAME = "Unknown Event";
const UNKNOWN_SELLER_NAME = "—";

export function mapSession(row: SessionRow, aggregates: SessionAggregates): SessionSummary {
  const evaluationCount = aggregates.evaluations.get(row.id) ?? 0;
  const cart = aggregates.carts.get(row.id) ?? {
    cartCount: 0,
    totalValue: 0,
    expectedProfit: 0,
  };


  return {
    id: row.id,
    sessionNumber: row.offerNumber,
    eventId: row.eventId ?? undefined,
    notes: row.notes ?? undefined,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    event: row.eventId
      ? {
          id: row.eventId,
          name: row.eventName ?? UNKNOWN_EVENT_NAME,
          location: row.eventLocation,
        }
      : undefined,
    seller: row.sellerId
      ? {
          id: row.contactId ?? row.sellerId, // Use contactId for navigation, fallback to sellerId
          name: row.sellerName ?? UNKNOWN_SELLER_NAME,
          email: row.sellerEmail ?? undefined,
          phone: row.sellerPhone ?? undefined,
        }
      : undefined,
    assetCount: evaluationCount + cart.cartCount,
    cartCount: cart.cartCount,
    totalValue: cart.totalValue,
    expectedProfit: cart.expectedProfit,
  };
}

export function normalizeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function normalizeId(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
