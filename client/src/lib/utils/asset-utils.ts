import { Asset } from "@shared/schema";

/**
 * Safely extracts and types the assets from an API response
 * @param data The API response data
 * @returns Typed Asset array
 */
export const extractAssetsFromResponse = (data: unknown): Asset[] => {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  return data as Asset[];
};
