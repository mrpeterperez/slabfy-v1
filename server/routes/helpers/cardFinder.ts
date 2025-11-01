// CARD FINDER 🔍
// Takes a user asset ID and finds the actual card data
// Returns card info with global ID for database lookups
import { db } from '../../db';
import { userAssets, globalAssets, consignmentAssets, consignments } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export interface Card {
  id: string;
  globalId: string;
  cardId: string | null;
  player: string | null;
  year: number | null;
  set: string | null;
  number: string | null;
  grade: string | null;
  grader: string | null;
  variant: string | null;
  title: string | null;
  purchasePrice: number | null;
  notes: string | null;
  // Serial number fields for search targeting
  serialNumbered: boolean;
  serialNumber: number | null;
  serialMax: number | null;
  // Pricing staleness tracking
  lastPricingUpdate: Date | null;
}

// BATCH VERSION - Ultra-fast portfolio loading BOOM!
export async function findCardsBatch(cardIds: string[]): Promise<Map<string, Card>> {
  if (!cardIds.length) return new Map();
  
  const { inArray } = await import('drizzle-orm');
  const cards = new Map<string, Card>();
  
  // 1. Try as global asset IDs (most common for batch pricing)
  const globalResults = await db
    .select({
      cardDetails: globalAssets,
    })
    .from(globalAssets)
    .where(inArray(globalAssets.id, cardIds));
  
  for (const row of globalResults) {
    const cardDetails = row.cardDetails;
    let serialMaxFromVariant: number | undefined;
    if (cardDetails.variant) {
      const m = cardDetails.variant.match(/\/(\d{1,4})\b/);
      if (m) serialMaxFromVariant = parseInt(m[1], 10);
    }
    cards.set(cardDetails.id, {
      id: cardDetails.id,
      globalId: cardDetails.id,
      cardId: cardDetails.cardId,
      player: cardDetails.playerName,
      year: cardDetails.year ? parseInt(cardDetails.year) : null,
      set: cardDetails.setName,
      number: cardDetails.cardNumber,
      grade: cardDetails.grade,
      grader: cardDetails.grader,
      variant: cardDetails.variant,
      title: cardDetails.title,
      purchasePrice: null,
      notes: null,
      serialNumbered: !!serialMaxFromVariant,
      serialNumber: null,
      serialMax: serialMaxFromVariant ?? null,
      lastPricingUpdate: cardDetails.lastPricingUpdate,
    });
  }
  
  // 2. Check remaining as user asset IDs
  const remaining = cardIds.filter(id => !cards.has(id));
  if (remaining.length > 0) {
    const userResults = await db
      .select({
        userCard: userAssets,
        cardDetails: globalAssets,
      })
      .from(userAssets)
      .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
      .where(inArray(userAssets.id, remaining));
    
    for (const row of userResults) {
      const { userCard, cardDetails } = row;
      cards.set(userCard.id, {
        id: userCard.id,
        globalId: cardDetails.id,
        cardId: cardDetails.cardId,
        player: cardDetails.playerName,
        year: cardDetails.year ? parseInt(cardDetails.year) : null,
        set: cardDetails.setName,
        number: cardDetails.cardNumber,
        grade: cardDetails.grade,
        grader: cardDetails.grader,
        variant: cardDetails.variant,
        title: cardDetails.title,
        purchasePrice: userCard.purchasePrice ? parseFloat(userCard.purchasePrice) : null,
        notes: userCard.notes,
        serialNumbered: userCard.serialNumbered || false,
        serialNumber: userCard.serialNumber,
        serialMax: userCard.serialMax,
        lastPricingUpdate: cardDetails.lastPricingUpdate,
      });
    }
  }
  
  return cards;
}

export async function findCard(cardId: string): Promise<Card | null> {
  // First try as user asset ID
  let result = await db
    .select({
      userCard: userAssets,
      cardDetails: globalAssets,
    })
    .from(userAssets)
    .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
    .where(eq(userAssets.id, cardId))
    .limit(1);

  // If not found, try as consignment asset ID
  if (result.length === 0) {
    const consignmentResult = await db
      .select({
        consignmentCard: consignmentAssets,
        cardDetails: globalAssets,
      })
      .from(consignmentAssets)
      .innerJoin(globalAssets, eq(consignmentAssets.globalAssetId, globalAssets.id))
      .where(eq(consignmentAssets.id, cardId))
      .limit(1);

    if (consignmentResult.length > 0) {
      const { consignmentCard, cardDetails } = consignmentResult[0];
      return {
        id: consignmentCard.id,
        globalId: cardDetails.id,
        cardId: cardDetails.cardId,
        player: cardDetails.playerName,
        year: cardDetails.year ? parseInt(cardDetails.year) : null,
        set: cardDetails.setName,
        number: cardDetails.cardNumber,
        grade: cardDetails.grade,
        grader: cardDetails.grader,
        variant: cardDetails.variant,
        title: cardDetails.title,
        purchasePrice: null, // No purchase price for consignment assets
        notes: consignmentCard.notes,
        // No serial number data for consignment assets
        serialNumbered: false,
        serialNumber: null,
        serialMax: null,
        lastPricingUpdate: cardDetails.lastPricingUpdate,
      };
    }
  }

  // If not found, try as global asset ID (for evaluation assets)
  if (result.length === 0) {
    result = await db
      .select({
        userCard: userAssets,
        cardDetails: globalAssets,
      })
      .from(userAssets)
      .innerJoin(globalAssets, eq(userAssets.globalAssetId, globalAssets.id))
      .where(eq(globalAssets.id, cardId))
      .limit(1);
  }

  // If still not found, try to find the global asset directly (in case no user asset exists)
  if (result.length === 0) {
    const globalResult = await db
      .select({
        cardDetails: globalAssets,
      })
      .from(globalAssets)
      .where(eq(globalAssets.id, cardId))
      .limit(1);

    if (globalResult.length > 0) {
      const cardDetails = globalResult[0].cardDetails;
      // Infer serial from variant like "/99" when possible
      let serialMaxFromVariant: number | undefined;
      if (cardDetails.variant) {
        const m = cardDetails.variant.match(/\/(\d{1,4})\b/);
        if (m) serialMaxFromVariant = parseInt(m[1], 10);
      }
      return {
        id: cardDetails.id,
        globalId: cardDetails.id,
        cardId: cardDetails.cardId,
        player: cardDetails.playerName,
        year: cardDetails.year ? parseInt(cardDetails.year) : null,
        set: cardDetails.setName,
        number: cardDetails.cardNumber,
        grade: cardDetails.grade,
        grader: cardDetails.grader,
        variant: cardDetails.variant,
        title: cardDetails.title,
        purchasePrice: null, // No purchase price for global assets
        notes: null,
        // Serial number data inferred for global assets
        serialNumbered: !!serialMaxFromVariant,
        serialNumber: null,
        serialMax: serialMaxFromVariant ?? null,
        lastPricingUpdate: cardDetails.lastPricingUpdate,
      };
    }
    
    return null;
  }

  const { userCard, cardDetails } = result[0];

  // Try to infer serial max from variant suffix like "/99" if present
  let serialMaxFromVariant: number | undefined;
  if (cardDetails.variant) {
    const m = cardDetails.variant.match(/\/(\d{1,4})\b/);
    if (m) serialMaxFromVariant = parseInt(m[1], 10);
  }
  const serialMaxEffective = userCard.serialMax ?? (serialMaxFromVariant ?? null);
  const serialNumberedEffective = !!(userCard.serialNumbered || serialMaxEffective);
  return {
    id: userCard.id,
    globalId: cardDetails.id,
    cardId: cardDetails.cardId,
    player: cardDetails.playerName,
    year: cardDetails.year ? parseInt(cardDetails.year) : null,
    set: cardDetails.setName,
    number: cardDetails.cardNumber,
    grade: cardDetails.grade,
    grader: cardDetails.grader,
    variant: cardDetails.variant,
    title: cardDetails.title,
    purchasePrice: userCard.purchasePrice ? parseFloat(userCard.purchasePrice.toString()) : null,
    notes: userCard.notes,
    // Serial number data from user asset
    serialNumbered: serialNumberedEffective,
  serialNumber: userCard.serialNumber,
    serialMax: serialMaxEffective,
    lastPricingUpdate: cardDetails.lastPricingUpdate,
  };
}