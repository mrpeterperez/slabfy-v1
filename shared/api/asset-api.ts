// 🤖 INTERNAL NOTE (LLM):
// This file provides API functions for asset management operations.
// It exports functions for creating, reading, updating, and deleting assets.
// Part of the shared API utilities.
// Depends on schema types from shared/schema.ts.

import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { insertAssetSchema } from "@shared/schema";

type FormValues = z.infer<typeof insertAssetSchema>;

/**
 * Create a new asset
 */
export const createAsset = async (data: FormValues) => {
  const response = await apiRequest("POST", "/api/assets", data);
  return response.json();
};

/**
 * Get all assets for a user
 */
export const getAssets = async (userId: string) => {
  const response = await apiRequest("GET", `/api/assets/user/${userId}`);
  return response.json();
};

/**
 * Get paginated assets for a user
 */
export const getPaginatedAssets = async (userId: string, limit: number, offset: number) => {
  const response = await apiRequest("GET", `/api/assets/user/${userId}?limit=${limit}&offset=${offset}`);
  return response.json();
};

/**
 * Get portfolio value for a user
 */
export const getPortfolioValue = async (userId: string) => {
  const response = await apiRequest("GET", `/api/assets/portfolio-value/${userId}`);
  return response.json();
};


/**
 * Get a single asset
 */
export const getAsset = async (assetId: string) => {
  const response = await apiRequest("GET", `/api/assets/${assetId}`);
  return response.json();
};

/**
 * Update an asset
 */
export const updateAsset = async (assetId: string, data: Partial<FormValues>) => {
  console.log('Updating asset with data:', JSON.stringify(data, null, 2));
  try {
    const response = await apiRequest("PATCH", `/api/assets/${assetId}`, data);
    const responseData = await response.json();
    if (!response.ok) {
      console.error('Update asset response error:', responseData);
    }
    return responseData;
  } catch (error) {
    console.error('Error updating asset:', error);
    throw error;
  }
};

/**
 * Delete an asset
 */
export const deleteAsset = async (assetId: string) => {
  try {
    const response = await apiRequest("DELETE", `/api/assets/${assetId}`);
    
    // For 204 No Content responses, return an empty object instead of trying to parse JSON
    if (response.status === 204) {
      return {};
    }
    
    return response.json();
  } catch (error: any) {
    console.error('Delete asset error:', error);
    // If 401, might be auth issue - rethrow with helpful message
    if (error?.status === 401) {
      throw new Error('Authentication required. Please refresh the page and try again.');
    }
    throw error;
  }
};