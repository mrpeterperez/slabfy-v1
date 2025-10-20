import { apiRequest } from "@/lib/queryClient";
import { Contact, InsertContact } from "@shared/schema";

/**
 * Get all contacts for the current user
 */
export const getContacts = async () => {
  const response = await apiRequest("GET", "/api/contacts");
  return response.json() as Promise<Contact[]>;
};

/**
 * Create a new contact
 */
export const createContact = async (data: InsertContact) => {
  const response = await apiRequest("POST", "/api/contacts", data);
  return response.json() as Promise<Contact>;
};

/**
 * Update an existing contact
 */
export const updateContact = async (contactId: string, data: Partial<InsertContact>) => {
  const response = await apiRequest("PATCH", `/api/contacts/${contactId}`, data);
  return response.json() as Promise<Contact>;
};

/**
 * Delete a contact
 */
export const deleteContact = async (contactId: string) => {
  const response = await apiRequest("DELETE", `/api/contacts/${contactId}`);
  return response.ok;
};