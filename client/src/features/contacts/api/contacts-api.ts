// 🤖 INTERNAL NOTE:
// Purpose: API functions for contacts CRUD operations
// Exports: getContacts, getContactsSummary, getContact, createContact, updateContact, deleteContact
// Feature: contacts
// Dependencies: @/lib/queryClient, @shared/schema

import { apiRequest } from '@/lib/queryClient';
import { type InsertContact, type UpdateContact } from '@shared/schema';

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  notes?: string | null;
  archived?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ContactsSummary {
  totalContacts: number;
  recentContacts: number;
  contactsWithEmail: number;
  contactsWithPhone: number;
}

export interface ContactReferences {
  buyingSessions: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date | string;
  }>;
  consignments: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: Date | string;
  }>;
  sales: Array<{
    id: string;
    title: string;
    salePrice: number;
    paymentMethod: string;
    eventName: string | null;
    eventId: string | null;
    createdAt: Date | string;
    role: 'buyer' | 'seller';
  }>;
  total: number;
  systems: string[];
}

/**
 * Get all contacts for the current user
 */
export const getContacts = async (archived?: boolean): Promise<Contact[]> => {
  let url = "/api/contacts";
  if (archived !== undefined) {
    url += `?archived=${archived}`;
  }
  const response = await apiRequest("GET", url);
  return response.json();
};

/**
 * Get contacts summary statistics
 */
export const getContactsSummary = async (archived?: boolean): Promise<ContactsSummary> => {
  let url = "/api/contacts/summary";
  if (archived !== undefined) {
    url += `?archived=${archived}`;
  }
  const response = await apiRequest("GET", url);
  return response.json();
};

/**
 * Get a single contact by ID
 */
export const getContact = async (contactId: string): Promise<Contact> => {
  const response = await apiRequest("GET", `/api/contacts/${contactId}`);
  return response.json();
};

/**
 * Create a new contact
 */
export const createContact = async (data: InsertContact): Promise<Contact> => {
  const response = await apiRequest("POST", "/api/contacts", data);
  return response.json();
};

/**
 * Update an existing contact
 */
export const updateContact = async (contactId: string, data: UpdateContact): Promise<Contact> => {
  const response = await apiRequest("PATCH", `/api/contacts/${contactId}`, data);
  return response.json();
};

/**
 * Delete a contact
 */
export const deleteContact = async (contactId: string): Promise<void> => {
  await apiRequest("DELETE", `/api/contacts/${contactId}`);
};

/**
 * Archive a contact
 */
export const archiveContact = async (contactId: string): Promise<Contact> => {
  const response = await apiRequest("PATCH", `/api/contacts/${contactId}/archive`);
  return response.json();
};

/**
 * Unarchive a contact
 */
export const unarchiveContact = async (contactId: string): Promise<Contact> => {
  const response = await apiRequest("PATCH", `/api/contacts/${contactId}/unarchive`);
  return response.json();
};

/**
 * Bulk archive contacts
 */
export const bulkArchiveContacts = async (contactIds: string[]): Promise<{ success: boolean; archivedCount: number; message: string }> => {
  const response = await apiRequest("PATCH", "/api/contacts/bulk/archive", {
    body: JSON.stringify({ contactIds }),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};

/**
 * Bulk unarchive contacts
 */
export const bulkUnarchiveContacts = async (contactIds: string[]): Promise<{ success: boolean; unarchivedCount: number; message: string }> => {
  const response = await apiRequest("PATCH", "/api/contacts/bulk/unarchive", {
    body: JSON.stringify({ contactIds }),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};

/**
 * Bulk delete contacts (must be archived)
 */
export const bulkDeleteContacts = async (contactIds: string[]): Promise<{ 
  success: boolean; 
  deleted: number; 
  failed: number; 
  details: { deleted: string[]; failed: Array<{ id: string; name?: string; reason: string }> };
  message: string;
}> => {
  const response = await apiRequest("DELETE", "/api/contacts/bulk/delete", {
    body: JSON.stringify({ contactIds }),
    headers: { 'Content-Type': 'application/json' }
  });
  return response.json();
};

/**
 * Get contact references (systems that reference this contact)
 */
export const getContactReferences = async (contactId: string): Promise<ContactReferences> => {
  const response = await apiRequest("GET", `/api/contacts/${contactId}/references`);
  return response.json();
};