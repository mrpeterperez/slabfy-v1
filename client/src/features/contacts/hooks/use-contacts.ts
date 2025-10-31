// 🤖 INTERNAL NOTE:
// Purpose: React Query hooks for contacts data management
// Exports: useContacts, useContactsSummary, useContact, useCreateContact, useUpdateContact, useDeleteContact
// Feature: contacts
// Dependencies: @tanstack/react-query, @/hooks/use-toast, @/components/auth-provider

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/components/auth-provider';
import { queryKeys } from '@/lib/query-keys';
import { TIER_3_DYNAMIC } from '@/lib/cache-tiers';
import { 
  getContacts, 
  getContactsSummary, 
  getContact,
  createContact, 
  updateContact, 
  deleteContact,
  archiveContact,
  unarchiveContact,
  bulkArchiveContacts,
  bulkUnarchiveContacts,
  bulkDeleteContacts,
  getContactReferences
} from '../api/contacts-api';
import type { Contact } from '../api/contacts-api';
import { type InsertContact, type UpdateContact } from '@shared/schema';

/**
 * Hook to get all contacts with optional archived filter
 */
export const useContacts = (archived?: boolean) => {
  return useQuery({
    queryKey: queryKeys.contacts.all(archived),
    queryFn: () => getContacts(archived),
    placeholderData: (previousData) => previousData,
    ...TIER_3_DYNAMIC,
  });
};

/**
 * Hook to get contacts summary
 */
export const useContactsSummary = (archived?: boolean) => {
  return useQuery({
    queryKey: queryKeys.contacts.summary(archived),
    queryFn: () => getContactsSummary(archived),
    placeholderData: (previousData) => previousData || {
      totalContacts: 0,
      recentContacts: 0,
      contactsWithEmail: 0,
      contactsWithPhone: 0,
    },
    ...TIER_3_DYNAMIC,
  });
};

/**
 * Hook to get a single contact
 */
export const useContact = (contactId: string) => {
  return useQuery({
    queryKey: queryKeys.contacts.detail(contactId),
    queryFn: async () => {
      const c = await getContact(contactId);
      return c;
    },
    enabled: !!contactId,
    placeholderData: (previousData) => previousData,
    ...TIER_3_DYNAMIC,
  });
};

/**
 * Hook to create a new contact with business-grade duplicate handling
 */
export const useCreateContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: InsertContact) => createContact(data),
    onSuccess: (response: any) => {
      // Invalidate and refetch contacts list and summary
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      
      // Business-grade success handling: Show phone warning if present
      if (response.phoneWarning) {
        toast({
          title: "Contact created with phone warning",
          description: response.phoneWarning.message,
          variant: "default", // Not destructive since contact was created
        });
      } else {
        toast({
          title: "Success",
          description: "Contact created successfully",
        });
      }
    },
    onError: (error: any) => {
      // Business-grade error handling: Handle specific error types
      const response = error.response?.data;
      
      if (response?.error === "EMAIL_ALREADY_EXISTS") {
        const contactName = response.existingContact?.name;
        toast({
          title: "Email already in use",
          description: contactName 
            ? `This email belongs to ${contactName}. Please use a different email.`
            : "This email is already in use. Please use a different email.",
          variant: "destructive",
        });
      } else if (response?.error === "Validation failed") {
        toast({
          title: "Please check your information",
          description: "Some fields need to be corrected before saving",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Couldn't create contact",
          description: "Please try again",
          variant: "destructive",
        });
      }
    },
  });
};

/**
 * Hook to update a contact
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateContact }) => 
      updateContact(id, data),
    onSuccess: (updatedContact) => {
      // Invalidate and refetch contacts list and summary
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      // Update the specific contact cache
      queryClient.setQueryData(["/api/contacts", updatedContact.id], updatedContact);
      // Optimistically patch the contacts list cache so list table reflects latest fields (e.g., notes)
      queryClient.setQueryData(["/api/contacts"], (prev: Contact[] | undefined) => {
        if (!prev) return prev;
        return prev.map((c) => (c.id === updatedContact.id ? { ...c, ...updatedContact } : c));
      });
      
      // 🔥 CRITICAL: Invalidate consignments cache so updated contact info appears everywhere
      // Contact updates should immediately reflect in consignments, buying desk, etc.
      queryClient.invalidateQueries({ 
        queryKey: ["/api/consignments"],
        exact: false // Invalidate all consignment queries
      });
      
      toast({
        title: "Success",
        description: "Contact updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error?.message || "Failed to update contact",
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to archive a contact
 */
export const useArchiveContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: archiveContact,
    onSuccess: (updated) => {
      // Update the specific contact cache immediately
      queryClient.setQueryData(["/api/contacts", updated.id], updated);
      // Refetch detail to ensure server is source of truth
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", updated.id] });
      // Invalidate contact lists and summary
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      toast({
        title: "Contact archived",
        description: "The contact has been archived successfully.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to archive contact";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to unarchive a contact
 */
export const useUnarchiveContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: unarchiveContact,
    onSuccess: (updated) => {
      // Update the specific contact cache immediately
      queryClient.setQueryData(["/api/contacts", updated.id], updated);
      // Refetch detail to ensure server is source of truth
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", updated.id] });
      // Invalidate contact lists and summary
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      toast({
        title: "Contact unarchived",
        description: "The contact has been restored successfully.",
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to unarchive contact";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook for bulk archiving contacts
 */
export const useBulkArchiveContacts = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: bulkArchiveContacts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      toast({
        title: "Contacts archived",
        description: data.message,
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to archive contacts";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook for bulk unarchiving contacts
 */
export const useBulkUnarchiveContacts = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: bulkUnarchiveContacts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      toast({
        title: "Contacts unarchived",
        description: data.message,
      });
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to unarchive contacts";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook for bulk deleting contacts (must be archived)
 */
export const useBulkDeleteContacts = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: bulkDeleteContacts,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      
      // Only show toast if all succeeded (no failures to show in dialog)
      if (data.failed === 0) {
        toast({
          title: "Contacts deleted",
          description: data.message,
        });
      }
      // If there are failures, the UI will show a results dialog instead
    },
    onError: (error: any) => {
      const message = error?.message || "Failed to delete contacts";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });
};

/**
 * Hook to get contact references
 */
export const useContactReferences = (contactId: string) => {
  return useQuery({
    queryKey: ["/api/contacts", contactId, "references"],
    queryFn: () => getContactReferences(contactId),
    staleTime: 5 * 60 * 1000, // 5 minutes - references don't change often
  });
};

/**
 * Hook to delete a contact
 */
export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      // Invalidate and refetch contacts list and summary
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });
    },
    onError: (error: any) => {
      const msg: string = error?.message || '';
      let description = "Failed to delete contact";
      if (msg.includes("409:") || msg.toLowerCase().includes("linked records")) {
        description = "This contact is linked to Seller/Buyer/Consignor records. Remove or transfer those links first.";
      } else if (msg.startsWith("404:")) {
        description = "Contact not found or you don't have access.";
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    },
  });
};