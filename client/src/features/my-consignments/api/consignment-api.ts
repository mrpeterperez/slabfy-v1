// 🤖 INTERNAL NOTE:
// Purpose: API functions for consignment CRUD operations and data fetching
// Exports: getConsignments, createConsignment, updateConsignment, deleteConsignment, etc.
// Feature: my-consignments
// Dependencies: @/lib/queryClient, @shared/schema

import { apiRequest } from "@/lib/queryClient";
import { 
  Consignment,
  InsertConsignment,
  UpdateConsignment,
  ConsignorWithContact,
  UpdateConsignor,
  ConsignmentWithDetails,
  InsertContact
} from "@shared/schema";

/**
 * Get all consignments for the current user
 */
export const getConsignments = async (userId: string, archived?: boolean, status?: string) => {
  let url = `/api/consignments/user/${userId}`;
  const params = new URLSearchParams();
  
  if (archived !== undefined) {
    params.append('archived', String(archived));
  }
  
  if (status && status !== 'all') {
    params.append('status', status);
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await apiRequest("GET", url);
  return response.json() as Promise<ConsignmentWithDetails[]>;
};

/**
 * Get a single consignment by ID
 */
export const getConsignment = async (consignmentId: string) => {
  const response = await apiRequest("GET", `/api/consignments/${consignmentId}`);
  return response.json() as Promise<ConsignmentWithDetails>;
};

/**
 * Get consignment summaries for the current user (revenue, pipelineValue, profit per consignment)
 */
export type ConsignmentSummary = {
  consignmentId: string;
  title: string;
  consignorName: string;
  assetsCount: number;
  revenue: number; // sum of soldPrice for sold items
  pipelineValue: number; // sum of askingPrice
  profit: number; // expected house share from asking prices
};

export const getConsignmentSummaries = async (): Promise<ConsignmentSummary[]> => {
  const response = await apiRequest("GET", `/api/consignments/summary`);
  return response.json();
};

/**
 * Create a new consignment
 */
export const createConsignment = async (data: InsertConsignment & { consignor: InsertContact }) => {
  const response = await apiRequest("POST", "/api/consignments", data);
  return response.json() as Promise<Consignment>;
};

/**
 * Update an existing consignment
 */
export const updateConsignment = async (consignmentId: string, data: UpdateConsignment) => {
  const response = await apiRequest("PATCH", `/api/consignments/${consignmentId}`, data);
  return response.json() as Promise<Consignment>;
};

/**
 * Delete a consignment
 */
export const deleteConsignment = async (consignmentId: string) => {
  const response = await apiRequest("DELETE", `/api/consignments/${consignmentId}`);
  return response.ok;
};

/**
 * Archive a consignment
 */
export const archiveConsignment = async (consignmentId: string): Promise<Consignment> => {
  const response = await apiRequest("PATCH", `/api/consignments/${consignmentId}/archive`);
  return response.json();
};

/**
 * Unarchive a consignment
 */
export const unarchiveConsignment = async (consignmentId: string): Promise<Consignment> => {
  const response = await apiRequest("PATCH", `/api/consignments/${consignmentId}/unarchive`);
  return response.json();
};

/**
 * Bulk archive consignments
 */
export const bulkArchiveConsignments = async (consignmentIds: string[]): Promise<{ 
  success: boolean; 
  archivedCount: number; 
  failedCount?: number;
  errors?: Array<{ id: string; error: string }>;
  message: string;
}> => {
  const response = await apiRequest("PATCH", "/api/consignments/bulk/archive", { consignmentIds });
  return response.json();
};

/**
 * Bulk unarchive consignments
 */
export const bulkUnarchiveConsignments = async (consignmentIds: string[]): Promise<{ 
  success: boolean; 
  unarchivedCount: number;
  failedCount?: number;
  errors?: Array<{ id: string; error: string }>;
  message: string;
}> => {
  const response = await apiRequest("PATCH", "/api/consignments/bulk/unarchive", { consignmentIds });
  return response.json();
};

/**
 * Bulk delete consignments (only archived consignments can be deleted)
 */
export const bulkDeleteConsignments = async (consignmentIds: string[]): Promise<{ 
  success: boolean; 
  deletedCount: number;
  failedCount?: number;
  errors?: Array<{ id: string; error: string }>;
  message: string;
}> => {
  const response = await apiRequest("DELETE", "/api/consignments/bulk/delete", { consignmentIds });
  return response.json();
};

/**
 * Get consignor information for a consignment
 */
export const getConsignor = async (consignmentId: string) => {
  const response = await apiRequest("GET", `/api/consignments/${consignmentId}/consignor`);
  return response.json() as Promise<ConsignorWithContact>;
};

/**
 * Update consignor information
 */
export const updateConsignor = async (consignmentId: string, data: UpdateConsignor) => {
  const response = await apiRequest("PATCH", `/api/consignments/${consignmentId}/consignor`, data);
  return response.json() as Promise<ConsignorWithContact>;
};

/**
 * Get aggregate consignment stats for the current user
 */
export type ConsignmentStats = {
  totalConsignmentValue: number;
  totalExpectedHouseShare: number;
  activeConsignments: number;
};

export const getConsignmentStats = async (): Promise<ConsignmentStats> => {
  const response = await apiRequest("GET", "/api/consignments/stats");
  return response.json();
};

/**
 * Get consignment status counts for the current user
 */
export type ConsignmentStatusCounts = {
  all: number;
  active: number;
  on_hold: number;
  returned: number;
  sold: number;
  draft: number;
};

export const getConsignmentStatusCounts = async (): Promise<ConsignmentStatusCounts> => {
  const response = await apiRequest("GET", "/api/consignments/status-counts");
  return response.json();
};