// 🤖 INTERNAL NOTE:
// Purpose: Main contact detail page with exact same layout as collection detail
// Exports: ContactDetail component
// Feature: contacts
// Dependencies: ./hooks, ./components, shadcn/ui, lucide-react

import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DetailPageHeader, type DetailPageNavItem, type DetailActionItem } from "@/components/layout";
import { User, Calendar, Link, Archive, ArchiveRestore, Trash2 } from "lucide-react";
// Mobile top tabs styled like AssetDetailsTabs
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useContact, useDeleteContact, useArchiveContact, useUnarchiveContact } from "../hooks/use-contacts";
import { useQueryClient } from "@tanstack/react-query";
import { EditContactDialog } from "./edit-contact-dialog";
import { ContactOverviewSection } from "./sections/contact-overview-section";
import { ContactActivitySection } from "./sections/contact-activity-section";
import { ContactReferencesSection } from "./sections/contact-references-section";

type TabType = 'overview' | 'activity' | 'references';

// Navigation items for contacts
const navigationItems: DetailPageNavItem[] = [
  { id: 'overview', label: 'Overview', path: '', icon: User },
  { id: 'activity', label: 'Activity', path: '/activity', icon: Calendar },
  { id: 'references', label: 'References', path: '/references', icon: Link }
];

// Loading skeleton component
function ContactSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  );
}

// Error display component
function ContactError({ error }: { error: Error }) {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.message || 'Failed to load contact. Please try again.'}
        </AlertDescription>
      </Alert>
    </div>
  );
}

export function ContactDetail() {
  const { id: contactId } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Determine active section from URL
  const basePath = `/contacts/${contactId}`;
  const activeTab: TabType = location === basePath ? 'overview' : 
                            location === `${basePath}/activity` ? 'activity' : 
                            location === `${basePath}/references` ? 'references' : 'overview';

  // Data hooks
  const { data: contact, error, isLoading } = useContact(contactId!);
  const queryClient = useQueryClient();
  const deleteContact = useDeleteContact();
  const archiveContact = useArchiveContact();
  const unarchiveContact = useUnarchiveContact();

  // Action items for contacts
  const actionItems: DetailActionItem[] = contact ? [
    ...(contact.archived ? [
      { 
        id: 'restore', 
        label: 'Restore', 
        icon: ArchiveRestore, 
        onClick: async () => {
          try {
            const updated = await unarchiveContact.mutateAsync(contact.id);
            queryClient.setQueryData(["/api/contacts", contact.id], updated);
          } catch (e) {
            // error already toasted
          }
        },
        disabled: unarchiveContact.isPending
      },
      { 
        id: 'delete', 
        label: 'Delete Permanently', 
        icon: Trash2, 
        onClick: async () => {
          try {
            await deleteContact.mutateAsync(contact.id);
          } catch (error) {
            console.error('Failed to delete contact:', error);
          }
        },
        variant: 'destructive' as const,
        disabled: deleteContact.isPending
      }
    ] : [
      { 
        id: 'archive', 
        label: 'Archive', 
        icon: Archive, 
        onClick: async () => {
          try {
            const updated = await archiveContact.mutateAsync(contact.id);
            queryClient.setQueryData(["/api/contacts", contact.id], updated);
          } catch (e) {
            // error already toasted
          }
        },
        disabled: archiveContact.isPending
      }
    ])
  ] : [];

  // Handle invalid contact ID
  if (!contactId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid contact ID. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailPageHeader
          title="Loading..."
          isLoading={true}
          basePath={basePath}
          currentTab={activeTab}
          navigationItems={navigationItems}
          actionItems={actionItems}
        />
        <div className="container mx-auto p-6">
          <ContactSkeleton />
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <DetailPageHeader
          title="Error"
          isLoading={false}
          basePath={basePath}
          currentTab={activeTab}
          navigationItems={navigationItems}
          actionItems={actionItems}
        />
        <div className="container mx-auto p-6">
          <ContactError error={error} />
        </div>
      </div>
    );
  }

  const handleEdit = () => {
    setEditDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!contact) return;
    setConfirmOpen(true);
  };

  const handleArchive = async () => {
    if (!contact) return;
    try {
  const updated = await archiveContact.mutateAsync(contact.id);
  // Ensure the detail view gets the latest
  queryClient.setQueryData(["/api/contacts", contact.id], updated);
    } catch (e) {
      // no-op error already toasted
    }
  };

  const handleUnarchive = async () => {
    if (!contact) return;
    try {
  const updated = await unarchiveContact.mutateAsync(contact.id);
  queryClient.setQueryData(["/api/contacts", contact.id], updated);
    } catch (e) {
      // no-op error already toasted
    }
  };

  const renderActiveSection = () => {
    if (!contact) return null;

    const sectionProps = { contact, onEdit: handleEdit, onDelete: handleDelete };

    switch (activeTab) {
      case 'overview':
        return <ContactOverviewSection {...sectionProps} />;
      
      case 'activity':
        return <ContactActivitySection {...sectionProps} />;
      
      case 'references':
        return <ContactReferencesSection {...sectionProps} />;
        
      default:
        return <ContactOverviewSection {...sectionProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DetailPageHeader 
        title={contact?.name || 'Contact'}
        subtitle={contact?.companyName || undefined}
        basePath={basePath}
        currentTab={activeTab}
        navigationItems={navigationItems}
        actionItems={actionItems}
        isLoading={isLoading}
        onNavigate={(tabId: string) => {
          const path = tabId === 'overview' ? basePath : 
                      tabId === 'activity' ? `${basePath}/activity` :
                      `${basePath}/references`;
          setLocation(path);
        }}
      />
      
      {/* Main Content Area - Now uses full width */}
      <div className="container mx-auto p-6">
        {renderActiveSection()}
      </div>

      {/* Edit Dialog */}
      {contact && (
        <EditContactDialog 
          open={editDialogOpen} 
          onOpenChange={setEditDialogOpen}
          contact={contact}
        />
      )}

      {/* Confirm Delete Dialog */}
      {contact && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{contact.archived ? 'Delete Permanently' : 'Delete Contact'}</DialogTitle>
              <DialogDescription>
                {contact.archived
                  ? `Permanently delete "${contact.name}"? This cannot be undone.`
                  : `Are you sure you want to delete "${contact.name}"? This action cannot be undone.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteContact.mutateAsync(contact.id);
                    setConfirmOpen(false);
                    setLocation('/contacts');
                  } catch (error) {
                    console.error('Failed to delete contact:', error);
                  }
                }}
              >
                {contact.archived ? 'Delete Permanently' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}