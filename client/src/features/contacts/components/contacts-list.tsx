// 🤖 INTERNAL NOTE:
// Purpose: Main contacts list page with same layout and style as collections
// Exports: ContactsList component
// Feature: contacts
// Dependencies: shadcn/ui, lucide-react, hooks/use-contacts

import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableShell } from "@/components/table/table-shell";
import { Checkbox } from "@/components/ui/checkbox";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar } from "@/components/ui/bulk-action-bar";
// Removed shadcn Tabs in favor of nav-styled tabs matching asset-details-tabs
import {
  Plus,
  Users,
  MoreHorizontal,
  Trash2,
  Edit3,
  Mail,
  Phone,
  Archive,
  ArchiveRestore,
  Building,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  useContacts,
  useContactsSummary,
  useDeleteContact,
  useArchiveContact,
  useUnarchiveContact,
  useContactReferences,
  useBulkArchiveContacts,
  useBulkUnarchiveContacts,
  useBulkDeleteContacts,
} from "@/features/contacts/hooks/use-contacts";
import { AddContactDialog } from "./add-contact-dialog";
import { EditContactDialog } from "./edit-contact-dialog";
import { type Contact } from "../api/contacts-api";
import { MobilePageWrapper } from "@/components/layout/mobile-page-wrapper";

// Row component to respect Rules of Hooks
function ContactRow({
  contact: c,
  isArchived,
  isSelected,
  onToggleSelection,
  onGoto,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  contact: Contact;
  isArchived: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
  onGoto: (id: string) => void;
  onEdit: (c: Contact) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const { data: references } = useContactReferences(c.id);
  const name = (c.name || "Contact").trim();
  const initial = (name.charAt(0).toUpperCase() || "C");

  return (
    <tr
      className="bg-card border-b hover:bg-muted/25 cursor-pointer group"
      onClick={() => onGoto(c.id)}
    >
      <td className="p-2 sm:p-3 pl-4 sm:pl-6 w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          aria-label={`Select ${name}`}
        />
      </td>
      <td className="p-2 sm:p-3 pr-2 sm:pr-3 w-1/2 md:w-2/5 align-top bg-card-muted group-hover:bg-muted/40 transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="border bg-secondary/5 h-12 w-12 sm:h-14 sm:w-14 rounded-md overflow-hidden bg-muted flex items-center justify-center text-sm sm:text-base font-medium text-muted-foreground shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate text-secondary">{name}</div>
            <div className="text-muted-foreground text-xs sm:text-sm truncate">
              {c.companyName || '—'}
            </div>
          </div>
        </div>
      </td>
    <td className="p-2 sm:p-3 w-48 sm:w-56 whitespace-nowrap text-left">
        {c.email ? (
      <span className="font-medium text-secondary inline-flex items-center gap-1">
            <Mail className="h-3 w-3" /> {c.email}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    <td className="p-2 sm:p-3 w-36 sm:w-40 whitespace-nowrap text-left">
        {c.phone ? (
      <span className="font-medium text-secondary inline-flex items-center gap-1">
            <Phone className="h-3 w-3" /> {c.phone}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
    <td className="p-2 sm:p-3 hidden lg:table-cell text-muted-foreground w-28 sm:w-32 whitespace-nowrap text-right">
        {c.createdAt ? new Date(c.createdAt as any).toLocaleDateString() : '—'}
      </td>
      <td className="p-2 sm:p-3 pr-4 sm:pr-6 w-10 sm:w-14" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(c); }}>
                <Edit3 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {isArchived ? (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnarchive(c.id); }}>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(c.id); }}>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </DropdownMenuItem>
              )}
              {isArchived && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(c.id, name); }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}

function ContactsPage() {
  /* ---------- nav / dialog ---------- */
  const [, setLocation] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDeleteDialogOpen, setBlockDeleteDialogOpen] = useState(false);
  const [bulkDeleteResultsOpen, setBulkDeleteResultsOpen] = useState(false);
  const [bulkDeleteResults, setBulkDeleteResults] = useState<{
    deleted: number;
    failed: number;
    failedDetails: Array<{ id: string; name?: string; reason: string }>;
  } | null>(null);
  const [contactToEdit, setContactToEdit] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<{ id: string; name: string; references?: any } | null>(null);
  
  /* ---------- tabs ---------- */
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');

  /* -------------- data -------------- */
  const isArchived = activeTab === 'archived';
  const { data: contacts = [], isLoading: contactsLoading } = useContacts(isArchived);
  const { data: summary, isLoading: summaryLoading } = useContactsSummary(false); // Only show active contact stats
  
  /* -------------- bulk selection -------------- */
  const bulkSelection = useBulkSelection();
  
  // Clear selection when switching tabs
  useEffect(() => {
    bulkSelection.clearSelection();
  }, [activeTab]);

  // Event listener for floating (+) button
  useEffect(() => {
    const handleAddContact = () => setAddDialogOpen(true);
    window.addEventListener('slabfy:add-contact', handleAddContact);
    return () => window.removeEventListener('slabfy:add-contact', handleAddContact);
  }, []);
  
  /* -------------- mutations -------------- */
  const deleteContact = useDeleteContact();
  const archiveContact = useArchiveContact();
  const unarchiveContact = useUnarchiveContact();
  const bulkArchiveMutation = useBulkArchiveContacts();
  const bulkUnarchiveMutation = useBulkUnarchiveContacts();
  const bulkDeleteMutation = useBulkDeleteContacts();

  const stats = summary ?? {
    totalContacts: 0,
    recentContacts: 0,
    contactsWithEmail: 0,
    contactsWithPhone: 0,
  };

  /* ----------- helpers -------------- */
  const fmt = useMemo(
    () => new Intl.NumberFormat(undefined, { notation: "compact" }),
    [],
  );
  const goto = (id: string) => setLocation(`/contacts/${id}`);
  
  const handleEditClick = (contact: Contact) => {
    setContactToEdit(contact);
    setEditDialogOpen(true);
  };
  
  const handleDeleteClick = async (id: string, name: string) => {
    // Check for references before showing delete dialog
    try {
      const references = await fetch(`/api/contacts/${id}/references`).then(r => r.json());
      
      if (references.total > 0) {
        // Has dependencies - show blocking dialog
        setContactToDelete({ id, name, references });
        setBlockDeleteDialogOpen(true);
      } else {
        // No dependencies - show confirmation dialog
        setContactToDelete({ id, name });
        setDeleteDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to check references:', error);
      // Fallback to regular delete dialog
      setContactToDelete({ id, name });
      setDeleteDialogOpen(true);
    }
  };
  
  const handleDelete = async () => {
    if (!contactToDelete) return;
    
    try {
      await deleteContact.mutateAsync(contactToDelete.id);
      setDeleteDialogOpen(false);
      setContactToDelete(null);
    } catch (error) {
      console.error('Failed to delete contact:', error);
    }
  };
  
  const handleArchiveContact = async (id: string) => {
    await archiveContact.mutateAsync(id);
  };
  
  const handleUnarchiveContact = async (id: string) => {
    await unarchiveContact.mutateAsync(id);
  };
  
  /* ----------- bulk action handlers ----------- */
  const handleBulkArchive = async () => {
    await bulkArchiveMutation.mutateAsync(bulkSelection.selectedIds);
    bulkSelection.clearSelection();
  };
  
  const handleBulkUnarchive = async () => {
    await bulkUnarchiveMutation.mutateAsync(bulkSelection.selectedIds);
    bulkSelection.clearSelection();
  };
  
  const handleBulkDelete = async () => {
    if (
      confirm(
        `Are you sure you want to permanently delete ${bulkSelection.selectedCount} contact(s)? This action cannot be undone.`
      )
    ) {
      try {
        const result = await bulkDeleteMutation.mutateAsync(bulkSelection.selectedIds);
        bulkSelection.clearSelection();
        
        // Show detailed results if there were any failures
        if (result.failed > 0) {
          setBulkDeleteResults({
            deleted: result.deleted,
            failed: result.failed,
            failedDetails: result.details.failed
          });
          setBulkDeleteResultsOpen(true);
        }
      } catch (error) {
        console.error('Bulk delete failed:', error);
      }
    }
  };

  /* -------------- ui -------------- */
  return (
    <MobilePageWrapper>
      <div className="mt-2 min-h-screen bg-background text-foreground">
        <main>
          {/* SAME outer wrapper as Collections / Consignments / Shows */}
          <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-48 space-y-6">
          {/* ---------- Header ---------- */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <h1 className="text-2xl font-semibold font-heading">Contacts</h1>

            {/* add-button: full width on mobile, right-aligned on desktop */}
            <div className="flex sm:ml-auto">
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Contact
              </Button>
            </div>
          </div>

          {/* ---------- Summary Cards (match Collections) ---------- */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { title: "Total Contacts", value: stats.totalContacts },
              { title: "With Email", value: stats.contactsWithEmail },
              { title: "With Phone", value: stats.contactsWithPhone },
            ].map(({ title, value }) => (
              <Card key={title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  {summaryLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <div className="text-2xl font-bold">{value}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* ---------- Tabs Navigation (styled like AssetDetailsTabs) ---------- */}
          <div className="border-b bg-background">
            <nav className="flex overflow-x-auto scrollbar-hide">
              {[
                { id: 'all', label: 'Active' },
                { id: 'archived', label: 'Archived' },
              ].map(({ id, label }) => {
                const isActive = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id as 'all' | 'archived')}
                    className={`whitespace-nowrap py-2 px-4 text-md font-medium flex-shrink-0 ${
                      isActive
                        ? 'border-b-4 border-primary text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:border-border'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ---------- Contacts Table (match Collections table styling) ---------- */}
          <TableShell
            isLoading={contactsLoading}
            isEmpty={contacts.length === 0}
            emptyState={isArchived ? (
              <div className="py-12 text-center">
                <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No archived contacts</h3>
                <p className="text-muted-foreground">
                  Use the Actions menu on a contact to move it to Archived. You can restore it later.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No contacts yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first contact to start building your network.
                </p>
                <Button onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Contact
                </Button>
              </div>
            )}
            containerClassName="bg-card-muted"
          >
            <table className="w-full min-w-full text-xs sm:text-sm text-muted-foreground">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 w-10">
                    <Checkbox
                      checked={bulkSelection.isAllSelected(contacts.map(c => c.id))}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          bulkSelection.selectAll(contacts.map(c => c.id));
                        } else {
                          bulkSelection.clearSelection();
                        }
                      }}
                      aria-label="Select all contacts"
                    />
                  </th>
                  <th className="text-left p-2 sm:p-3 pr-2 sm:pr-3 font-medium w-1/2 md:w-2/5">Name</th>
                  <th className="text-left p-2 sm:p-3 font-medium w-48 sm:w-56 whitespace-nowrap">Email</th>
                  <th className="text-left p-2 sm:p-3 font-medium w-36 sm:w-40 whitespace-nowrap">Phone</th>
                  <th className="text-right p-2 sm:p-3 font-medium hidden lg:table-cell w-28 sm:w-32 whitespace-nowrap">Created</th>
                  <th className="text-right p-2 sm:p-3 pr-4 sm:pr-6 font-medium w-10 sm:w-14">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    isArchived={isArchived}
                    isSelected={bulkSelection.isSelected(c.id)}
                    onToggleSelection={() => bulkSelection.toggle(c.id)}
                    onGoto={goto}
                    onEdit={handleEditClick}
                    onArchive={handleArchiveContact}
                    onUnarchive={handleUnarchiveContact}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </tbody>
            </table>
          </TableShell>
        </div>
      </main>

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedCount={bulkSelection.selectedCount}
        onClearSelection={bulkSelection.clearSelection}
        actions={
          isArchived
            ? [
                {
                  key: 'unarchive',
                  label: 'Restore',
                  icon: ArchiveRestore,
                  onClick: handleBulkUnarchive,
                  variant: 'default',
                },
                {
                  key: 'delete',
                  label: 'Delete',
                  icon: Trash2,
                  onClick: handleBulkDelete,
                  variant: 'destructive',
                },
              ]
            : [
                {
                  key: 'archive',
                  label: 'Archive',
                  icon: Archive,
                  onClick: handleBulkArchive,
                  variant: 'default',
                },
              ]
        }
      />

      {/* Dialogs */}
      <AddContactDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />

      {contactToEdit && (
        <EditContactDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          contact={contactToEdit}
        />
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{contactToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleteContact.isPending}
            >
              {deleteContact.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Blocking Dialog - Contact has dependencies */}
      <Dialog open={blockDeleteDialogOpen} onOpenChange={setBlockDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>⚠️ Cannot Delete Contact</DialogTitle>
            <DialogDescription>
              {contactToDelete?.name} is linked to other records in your system.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-3">This contact is associated with:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {contactToDelete?.references?.buyingSessions && contactToDelete.references.buyingSessions.length > 0 && (
                <li className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{contactToDelete.references.buyingSessions.length} Buy Offer{contactToDelete.references.buyingSessions.length !== 1 ? 's' : ''}</span>
                </li>
              )}
              {contactToDelete?.references?.consignments && contactToDelete.references.consignments.length > 0 && (
                <li className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{contactToDelete.references.consignments.length} Consignment{contactToDelete.references.consignments.length !== 1 ? 's' : ''}</span>
                </li>
              )}
              {contactToDelete?.references?.sales && contactToDelete.references.sales.length > 0 && (
                <li className="flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  <span>{contactToDelete.references.sales.length} Event Sale{contactToDelete.references.sales.length !== 1 ? 's' : ''}</span>
                </li>
              )}
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              Please remove these associations first, or keep this contact <span className="font-medium">archived</span> to preserve your records.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDeleteDialogOpen(false)}>
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Results Dialog */}
      <Dialog open={bulkDeleteResultsOpen} onOpenChange={setBulkDeleteResultsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkDeleteResults?.deleted === 0 ? '⚠️ Delete Failed' : '✅ Deletion Complete'}
            </DialogTitle>
            <DialogDescription>
              {bulkDeleteResults?.deleted === 0 
                ? 'No contacts could be deleted.'
                : bulkDeleteResults?.failed === 0
                ? `Successfully deleted ${bulkDeleteResults?.deleted} contact${bulkDeleteResults?.deleted !== 1 ? 's' : ''}.`
                : `Deleted ${bulkDeleteResults?.deleted} contact${bulkDeleteResults?.deleted !== 1 ? 's' : ''}, but ${bulkDeleteResults?.failed} could not be deleted.`
              }
            </DialogDescription>
          </DialogHeader>
          
          {bulkDeleteResults && bulkDeleteResults.failed > 0 && (
            <div className="py-4 max-h-64 overflow-y-auto">
              <p className="text-sm font-medium mb-3">Could not delete:</p>
              <ul className="space-y-2">
                {bulkDeleteResults.failedDetails.map((f, idx) => (
                  <li key={idx} className="text-sm border-l-2 border-destructive pl-3 py-1">
                    <div className="font-medium">{f.name || 'Unknown Contact'}</div>
                    <div className="text-muted-foreground text-xs">{f.reason}</div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground mt-4">
                These contacts have linked records. Remove their associations or keep them archived.
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setBulkDeleteResultsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </MobilePageWrapper>
  );
}

// Export both as default and named export for different import patterns
export default ContactsPage;
export { ContactsPage as ContactsList };