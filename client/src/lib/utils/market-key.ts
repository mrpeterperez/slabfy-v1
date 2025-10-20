/**
 * Helper function to generate consistent market data keys
 * 
 * This ensures we use the same key pattern that useBatchMarketSnapshot
 * uses to store market data: `globalAssetId || id`
 */
export function getMarketKey(asset: { globalAssetId?: string | null; id: string }): string {
  return asset.globalAssetId || asset.id;
}

/**
 * Get market data for an asset using the correct key
 */
export function getMarketData<T>(
  marketData: Record<string, T>, 
  asset: { globalAssetId?: string | null; id: string }
): T | undefined {
  const key = getMarketKey(asset);
  return marketData[key];
}

/**
 * Check if an asset has pending market data using the correct key
 */
export function isMarketPending(
  pending: Record<string, any>, 
  asset: { globalAssetId?: string | null; id: string }
): boolean {
  const key = getMarketKey(asset);
  return !!pending[key];
}