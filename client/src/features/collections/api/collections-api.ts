import { apiRequest } from '@/lib/queryClient';
import { type InsertCollection, type UpdateCollection, type InsertCollectionAsset } from '@shared/schema';
import { type CollectionWithDetailsClient } from '@/features/collections/types';

/**
 * Get all collections for the current user
 */
export const getCollections = async (archived?: boolean): Promise<CollectionWithDetailsClient[]> => {
  let url = "/api/collections";
  if (typeof archived === "boolean") {
    url += `?archived=${archived}`;
  }
  const response = await apiRequest("GET", url);
  return response.json();
};

/**
 * Get collections summary
 */
export const getCollectionsSummary = async () => {
  const response = await apiRequest("GET", "/api/collections/summary");
  return response.json();
};

/**
 * Get a single collection by ID
 */
export const getCollection = async (collectionId: string): Promise<CollectionWithDetailsClient> => {
  const response = await apiRequest("GET", `/api/collections/${collectionId}`);
  return response.json();
};

/**
 * Create a new collection
 */
export const createCollection = async (data: InsertCollection & { userId?: string }): Promise<CollectionWithDetailsClient> => {
  const response = await apiRequest("POST", "/api/collections", data);
  return response.json();
};

/**
 * Update an existing collection
 */
export const updateCollection = async (collectionId: string, data: UpdateCollection): Promise<CollectionWithDetailsClient> => {
  const response = await apiRequest("PATCH", `/api/collections/${collectionId}`, data);
  return response.json();
};

/**
 * Delete a collection
 */
export const deleteCollection = async (collectionId: string): Promise<void> => {
  await apiRequest("DELETE", `/api/collections/${collectionId}`);
};

/**
 * Get assets in a collection
 */
export const getCollectionAssets = async (collectionId: string) => {
  const response = await apiRequest("GET", `/api/collections/${collectionId}/assets`);
  return response.json();
};

/**
 * Get assets in a collection with ownership information
 */
export const getCollectionAssetsWithOwnership = async (collectionId: string, userId: string) => {
  const response = await apiRequest("GET", `/api/collections/${collectionId}/assets?userId=${userId}`);
  return response.json();
};

/**
 * Add asset to collection
 */
export const addAssetToCollection = async (data: InsertCollectionAsset) => {
  const response = await apiRequest("POST", `/api/collections/${data.collectionId}/assets`, data);
  return response.json();
};

/**
 * Remove asset from collection
 */
export const removeAssetFromCollection = async (collectionId: string, globalAssetId: string) => {
  await apiRequest("DELETE", `/api/collections/${collectionId}/assets/${globalAssetId}`);
};

/**
 * Archive a collection
 */
export const archiveCollection = async (collectionId: string): Promise<CollectionWithDetailsClient> => {
  const response = await apiRequest("PATCH", `/api/collections/${collectionId}/archive`);
  return response.json();
};

/**
 * Unarchive a collection
 */
export const unarchiveCollection = async (collectionId: string): Promise<CollectionWithDetailsClient> => {
  const response = await apiRequest("PATCH", `/api/collections/${collectionId}/unarchive`);
  return response.json();
};

/**
 * Bulk archive collections
 */
export const bulkArchiveCollections = async (collectionIds: string[]): Promise<{ 
  success: boolean; 
  archivedCount: number; 
  failedCount?: number;
  errors?: Array<{ id: string; error: string }>;
  message: string;
}> => {
  const response = await apiRequest("PATCH", "/api/collections/bulk/archive", { collectionIds });
  return response.json();
};

/**
 * Bulk unarchive collections
 */
export const bulkUnarchiveCollections = async (collectionIds: string[]): Promise<{ 
  success: boolean; 
  unarchivedCount: number; 
  failedCount?: number;
  errors?: Array<{ id: string; error: string }>;
  message: string;
}> => {
  const response = await apiRequest("PATCH", "/api/collections/bulk/unarchive", { collectionIds });
  return response.json();
};

/**
 * Bulk delete collections (only archived collections can be deleted)
 */
export const bulkDeleteCollections = async (collectionIds: string[]): Promise<{ 
  success: boolean; 
  deletedCount: number; 
  failedCount?: number;
  errors?: Array<{ id: string; error: string }>;
  message: string;
}> => {
  const response = await apiRequest("DELETE", "/api/collections/bulk/delete", { collectionIds });
  return response.json();
};