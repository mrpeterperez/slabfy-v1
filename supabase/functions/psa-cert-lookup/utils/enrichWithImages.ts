// 🤖 INTERNAL NOTE (LLM):
// Utility function to enrich the mapped PSA asset data with image URLs.
// Takes PSA images array and adds front/back URLs to the asset object.

import { PSAImage } from "../types.ts";
import { MappedAsset } from "../types.ts";

/**
 * Adds front and back image URLs to the mapped asset data
 * @param mappedAsset - The asset data already mapped from PSA cert
 * @param images - Array of PSA image objects
 * @returns The asset data enriched with front and back image URLs
 */
export function enrichWithImages(mappedAsset: MappedAsset, images: PSAImage[]): MappedAsset {
  if (!images || images.length === 0) {
    return mappedAsset;
  }

  const enriched = { ...mappedAsset };
  
  // Find front image (where IsFrontImage is true)
  const frontImage = images.find(img => img.IsFrontImage === true);
  if (frontImage) {
    // Use LargeImageUrl if available, otherwise fall back to ImageURL
    const imageUrl = frontImage.LargeImageUrl || frontImage.ImageURL;
    if (imageUrl) {
      enriched.psaImageFrontUrl = imageUrl;
    }
  }
  
  // Find back image (where IsFrontImage is false)
  const backImage = images.find(img => img.IsFrontImage === false);
  if (backImage) {
    // Use LargeImageUrl if available, otherwise fall back to ImageURL
    const imageUrl = backImage.LargeImageUrl || backImage.ImageURL;
    if (imageUrl) {
      enriched.psaImageBackUrl = imageUrl;
    }
  }

  return enriched;
}