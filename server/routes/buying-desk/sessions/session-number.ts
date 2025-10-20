// 🤖 INTERNAL NOTE:
// Purpose: Generate human-readable unique session numbers for buying desk
// Exports: generateSessionNumber
// Feature: buying-desk
// Dependencies: drizzle-orm, @shared/schema, ../../../db

import { sql } from "drizzle-orm";
import { buyOffers } from "@shared/schema";

import { db } from "../../../db";

const SESSION_NUMBER_PREFIX = "BD";

export async function generateSessionNumber(): Promise<string> {
  const [result] = await db
    .select({
      maxSequence: sql<number>`COALESCE(MAX(CAST(COALESCE((regexp_match(${buyOffers.offerNumber}, '([0-9]+)$'))[1], '0') AS INTEGER)), 0)`,
    })
    .from(buyOffers);

  const sequence = Number(result?.maxSequence ?? 0) + 1;
  const year = new Date().getFullYear();
  return `${SESSION_NUMBER_PREFIX}-${year}-${sequence.toString().padStart(4, "0")}`;
}
