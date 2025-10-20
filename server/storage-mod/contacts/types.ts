import type { Contact, InsertContact } from "@shared/schema";

export interface IContactsStorage {
  getContactsByUserId(userId: string, archived?: boolean): Promise<Contact[]>;
  getContactById(contactId: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact & { userId: string }): Promise<Contact>;
  updateContact(contactId: string, data: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContact(contactId: string): Promise<boolean>;
  archiveContact(contactId: string): Promise<Contact | undefined>;
  unarchiveContact(contactId: string): Promise<Contact | undefined>;
  bulkArchiveContacts(contactIds: string[]): Promise<number>;
  bulkUnarchiveContacts(contactIds: string[]): Promise<number>;
  getContactReferences(contactId: string): Promise<{
    buyingSessions: Array<{ id: string; title: string; status: string; createdAt: Date }>;
    consignments: Array<{ id: string; title: string; status: string; createdAt: Date }>;
    sales: Array<{ id: string; title: string; salePrice: number; paymentMethod: string; eventName: string | null; createdAt: Date; role: 'buyer' | 'seller' }>;
    total: number;
    systems: string[];
  }>;
}
