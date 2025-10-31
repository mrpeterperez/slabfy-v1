import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/auth-provider";
import { 
  getContacts,
  createContact,
  updateContact,
  deleteContact
} from "../api/contacts-api";
import { InsertContact } from "@shared/schema";

/**
 * Hook to get all contacts for the current user
 */
export const useContacts = () => {
  const { user, loading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["/api/contacts", user?.id],
    queryFn: getContacts,
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000, // 5 minutes - contacts don't change frequently
    // Cache settings handled by global QueryClient defaults
  });
};

/**
 * Hook to create a new contact
 */
export const useCreateContact = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  return useMutation({
    mutationFn: (data: InsertContact) => createContact(data),
    onSuccess: () => {
      // Invalidate both Consignments-local and global Contacts caches
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", user?.id] });
      // Global Contacts feature (matches useContacts({ archived }))
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
    },
  });
};

/**
 * Hook to update an existing contact
 */
export const useUpdateContact = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: Partial<InsertContact> }) => 
      updateContact(contactId, data),
    onSuccess: (updatedContact) => {
      // 🎯 Update the specific contact cache with new data
      queryClient.setQueryData(["/api/contacts", updatedContact.id], updatedContact);
      // 🎯 Update the contacts list cache so dropdown reflects latest changes
      queryClient.setQueryData(["/api/contacts"], (prev: any[] | undefined) => {
        if (!prev) return prev;
        return prev.map((c: any) => (c.id === updatedContact.id ? { ...c, ...updatedContact } : c));
      });
      // Invalidate and refetch contacts list (both local and global)
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
      // 🎯 CRITICAL: Invalidate buying desk sellers since contacts are used as sellers
      queryClient.invalidateQueries({ queryKey: ["buying-desk", "sellers"] });
    },
  });
};

/**
 * Hook to delete a contact
 */
export const useDeleteContact = () => {
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();

  return useMutation({
    mutationFn: (contactId: string) => deleteContact(contactId),
    onSuccess: () => {
      // Invalidate and refetch contacts list (both local and global)
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/contacts/summary"] });
    },
  });
};