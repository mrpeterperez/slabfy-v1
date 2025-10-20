// Draft price management for buying desk
// Stores temporary price changes in memory before persistence

// In-memory storage for draft prices
// Structure: { sessionId: { assetId: price } }
const draftPrices: Record<string, Record<string, number>> = {};

/**
 * Get a draft price for an asset in a session
 * @param sessionId - The session ID
 * @param assetId - The asset ID
 * @returns The draft price or undefined if not set
 */
export function getDraftPrice(sessionId: string, assetId: string): number | undefined {
  return draftPrices[sessionId]?.[assetId];
}

/**
 * Set a draft price for an asset in a session
 * @param sessionId - The session ID
 * @param assetId - The asset ID
 * @param price - The draft price to set
 */
export function setDraftPrice(sessionId: string, assetId: string, price: number): void {
  if (!draftPrices[sessionId]) {
    draftPrices[sessionId] = {};
  }
  draftPrices[sessionId][assetId] = price;
}

/**
 * Clear all draft prices for a session
 * @param sessionId - The session ID
 */
export function clearSessionDraftPrices(sessionId: string): void {
  delete draftPrices[sessionId];
}

/**
 * Clear a specific draft price
 * @param sessionId - The session ID
 * @param assetId - The asset ID
 */
export function clearDraftPrice(sessionId: string, assetId: string): void {
  if (draftPrices[sessionId]) {
    delete draftPrices[sessionId][assetId];
    
    // Clean up empty session objects
    if (Object.keys(draftPrices[sessionId]).length === 0) {
      delete draftPrices[sessionId];
    }
  }
}

/**
 * Get all draft prices for a session
 * @param sessionId - The session ID
 * @returns Object with assetId -> price mappings
 */
export function getAllDraftPrices(sessionId: string): Record<string, number> {
  return draftPrices[sessionId] || {};
}