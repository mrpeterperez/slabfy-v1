// pages/collections.tsx
// 🤖 INTERNAL NOTE:
// Purpose: Collections management page with bulk operations support
// Features: Active/Archived tabs, bulk archive/restore/delete, checkbox selection
// Architecture: Uses reusable useBulkSelection hook + BulkActionBar component
import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { TableShell } from "@/components/table/table-shell";
import { CollectionVisibilityPill } from "@/components/status/collection-visibility-pill";
import {
  Plus,
  FolderOpen,
  Grid as GridIcon,
  BarChart,
  Users,
  MoreHorizontal,
  Trash2,
  Archive,
  ArchiveRestore,
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
import { insertCollectionSchema, type InsertCollection } from "@shared/schema";
import {
  useCollections,
  useCollectionsSummary,
  useDeleteCollection,
  useArchiveCollection,
  useUnarchiveCollection,
  useBulkArchiveCollections,
  useBulkUnarchiveCollections,
  useBulkDeleteCollections,
} from "@/features/collections/hooks/use-collections";
import { AddCollectionDialog } from "./add-collection-dialog";
import { useBulkSelection } from "@/hooks/use-bulk-selection";
import { BulkActionBar, type BulkAction } from "@/components/ui/bulk-action-bar";

type CreateCollectionData = InsertCollection;

interface CollectionsListProps {
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: () => void;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
}

function CollectionsPage({
  selectedIds: externalSelectedIds,
  onToggleSelection: externalToggleSelection,
  onSelectAll: externalSelectAll,
  isAllSelected: externalIsAllSelected,
  isSomeSelected: externalIsSomeSelected,
}: CollectionsListProps = {}) {
  /* ---------- nav / dialog ---------- */
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'archived'>('all');

  /* -------------- data -------------- */
  // Pass false for Active tab, true for Archived tab
  const { data: collections = [], isLoading: collectionsLoading } =
    useCollections(activeTab === 'archived' ? true : false);
  const { data: summary, isLoading: summaryLoading } = useCollectionsSummary();
  const deleteCollection = useDeleteCollection();
  const archiveCollection = useArchiveCollection();
  const unarchiveCollection = useUnarchiveCollection();
  const bulkArchiveCollections = useBulkArchiveCollections();
  const bulkUnarchiveCollections = useBulkUnarchiveCollections();
  const bulkDeleteCollections = useBulkDeleteCollections();

  const stats = summary ?? {
    totalCollections: 0,
    totalAssets: 0,
    publicCollections: 0,
  };

  /* ---------- bulk selection ---------- */
  const collectionIds = collections.map(c => c.id);
  const internalBulkSelection = useBulkSelection();
  
  // Use external props if provided, otherwise use internal state
  const selectedIds = externalSelectedIds ?? internalBulkSelection.selected;
  const onToggleSelection = externalToggleSelection ?? internalBulkSelection.toggle;
  const onSelectAll = externalSelectAll ?? (() => internalBulkSelection.selectAll(collectionIds));
  const isAllSelected = externalIsAllSelected ?? internalBulkSelection.isAllSelected(collectionIds);
  const isSomeSelected = externalIsSomeSelected ?? internalBulkSelection.isSomeSelected(collectionIds);
  const clearSelection = internalBulkSelection.clearSelection;

  /* ---------- bulk action handlers ---------- */
  const handleBulkArchive = async () => {
    const ids = Array.from(selectedIds);
    await bulkArchiveCollections.mutateAsync(ids);
    clearSelection();
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    await bulkUnarchiveCollections.mutateAsync(ids);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    await bulkDeleteCollections.mutateAsync(ids);
    clearSelection();
  };

  // Bulk actions based on active tab
  const bulkActions: BulkAction[] = activeTab === 'all' ? [
    {
      key: "archive",
      label: "Archive",
      icon: Archive,
      onClick: handleBulkArchive,
      variant: "default",
      loading: bulkArchiveCollections.isPending,
    },
  ] : [
    {
      key: "restore",
      label: "Restore",
      icon: ArchiveRestore,
      onClick: handleBulkRestore,
      variant: "default",
      loading: bulkUnarchiveCollections.isPending,
    },
    {
      key: "delete",
      label: "Delete Permanently",
      icon: Trash2,
      onClick: handleBulkDelete,
      variant: "destructive",
      loading: bulkDeleteCollections.isPending,
    },
  ];

  // Clear selection when switching tabs
  useEffect(() => {
    clearSelection();
  }, [activeTab]);

  /* ----------- helpers -------------- */
  const fmt = useMemo(
    () => new Intl.NumberFormat(undefined, { notation: "compact" }),
    [],
  );
  const goto = (id: string) => setLocation(`/collections/${id}`);
  const handleDeleteClick = (id: string, name: string) => {
    setCollectionToDelete({ id, name });
    setDeleteDialogOpen(true);
  };
  
  const handleDelete = async () => {
    if (!collectionToDelete) return;
    
    try {
      await deleteCollection.mutateAsync(collectionToDelete.id);
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
    } catch (error) {
      console.error('Failed to delete collection:', error);
    }
  };

  const handleArchiveClick = async (id: string) => {
    try {
      await archiveCollection.mutateAsync(id);
    } catch (error) {
      console.error('Failed to archive collection:', error);
    }
  };

  const handleUnarchiveClick = async (id: string) => {
    try {
      await unarchiveCollection.mutateAsync(id);
    } catch (error) {
      console.error('Failed to unarchive collection:', error);
    }
  };

  /* -------------- form -------------- */
  // Creation handled in AddCollectionDialog

  /* -------------- ui -------------- */
  return (
    <div className="mt-2 min-h-screen bg-background text-foreground">
  <main>
  {/* SAME outer wrapper as Buy / Consignments / Shows */}
  <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-48 space-y-6">
          {/* ---------- Header ---------- */}
          <div className="flex flex-col gap-4 mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
            <h1 className="text-2xl font-semibold font-heading">Collections</h1>

            {/* add-button: full width on mobile, right-aligned on desktop */}
            <div className="flex sm:ml-auto">
              <Button
                onClick={() => setDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </div>
          </div>

          {/* ---------- Summary Cards ---------- */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {
                title: "Total Collections",
                value: stats.totalCollections,
              },
              {
                title: "Total Assets",
                value: stats.totalAssets,
              },
              {
                title: "Public Collections",
                value: stats.publicCollections,
              },
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

          {/* ---------- Tabs Navigation (moved under summary cards) ---------- */}
          <div className="border-b bg-background mb-4">
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

          {/* ---------- Collections Table ---------- */}
          {/* Better empty state for Archive tab */}
          {(() => {
            const emptyStateContent = activeTab === 'archived' ? (
              <div className="py-12 text-center">
                <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No archived collections</h3>
                <p className="text-muted-foreground">
                  Use the Actions menu on a collection to move it to Archived. You can restore it later.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No collections yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first collection to start organizing your assets.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Collection
                </Button>
              </div>
            );
            return null; // placeholder to ensure IIFE scope
          })()}
          <TableShell
            isLoading={collectionsLoading}
            isEmpty={collections.length === 0}
            emptyState={activeTab === 'archived' ? (
              <div className="py-12 text-center">
                <Archive className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No archived collections</h3>
                <p className="text-muted-foreground">
                  Use the Actions menu on a collection to move it to Archived. You can restore it later.
                </p>
              </div>
            ) : (
              <div className="py-12 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No collections yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first collection to start organizing your assets.
                </p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Collection
                </Button>
              </div>
            )}
            containerClassName="bg-card-muted"
          >
                <table className="w-full min-w-full text-xs sm:text-sm text-muted-foreground">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 sm:p-3 pl-4 sm:pl-6 font-medium w-10">
                        <Checkbox
                          checked={isAllSelected ? true : (isSomeSelected ? "indeterminate" : false)}
                          onCheckedChange={() => {
                            if (isAllSelected) {
                              // Unselect all when currently all selected
                              clearSelection();
                            } else {
                              // Select all when none or some selected
                              internalBulkSelection.selectAll(collectionIds);
                            }
                          }}
                          aria-label="Select all collections"
                        />
                      </th>
                      <th className="text-left p-2 sm:p-3 pr-2 sm:pr-3 font-medium w-1/2 md:w-2/5">
                        Title
                      </th>
                      <th className="text-left p-2 sm:p-3 font-medium w-24 sm:w-28 whitespace-nowrap">
                        Assets
                      </th>
                      <th className="text-left p-2 sm:p-3 font-medium hidden md:table-cell w-28 sm:w-32 whitespace-nowrap">
                        Visibility
                      </th>
                      <th className="text-left p-2 sm:p-3 font-medium hidden lg:table-cell w-28 sm:w-32 whitespace-nowrap">
                        Created
                      </th>
                      <th className="text-right p-2 sm:p-3 pr-4 sm:pr-6 font-medium w-10 sm:w-14">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {collections.map((c) => {
                      const isSelected = selectedIds.has(c.id);
                      return (
                      <tr
                        key={c.id}
                        className={`bg-card border-b hover:bg-muted/50 cursor-pointer group transition-colors ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}`}
                        onClick={() => goto(c.id)}
                      >
                        <td 
                          className="p-2 sm:p-3 pl-4 sm:pl-6 w-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelection(c.id)}
                            aria-label={`Select ${c.name}`}
                          />
                        </td>
                        <td className="p-2 sm:p-3 pl-4 sm:pl-6 pr-2 sm:pr-3 w-1/2 md:w-2/5 align-top">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
          className="border bg-secondary/5 h-12 w-12 sm:h-14 sm:w-14 rounded-md overflow-hidden bg-muted flex items-center justify-center text-sm sm:text-base font-medium text-muted-foreground shrink-0"
                              aria-label={(c.thumbnailUrl || c.coverImageUrl) ? undefined : `Placeholder for ${c.name}`}
                            >
                              {(c.thumbnailUrl || c.coverImageUrl) ? (
                                <img
                                  src={c.thumbnailUrl || c.coverImageUrl || ''}
                                  alt={c.name}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                (c.name?.trim()?.charAt(0)?.toUpperCase() || "C")
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium truncate text-secondary">{c.name}</div>
                              <div className="text-muted-foreground text-xs sm:text-sm truncate">
                                {c.description || "—"}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-2 sm:p-3 w-24 sm:w-28 whitespace-nowrap">
                          <span className="font-medium text-secondary">{c.totalAssets || 0}</span>
                          <div className="hidden md:block text-xs text-muted-foreground mt-1">
                            {c.personalAssets || 0} personal, {c.consignmentAssets || 0} consignment
                          </div>
                        </td>

                        <td className="p-2 sm:p-3 hidden md:table-cell w-28 sm:w-32 whitespace-nowrap">
                          <CollectionVisibilityPill isPublic={c.isPublic} />
                        </td>

                        <td className="p-2 sm:p-3 hidden lg:table-cell text-muted-foreground w-28 sm:w-32 whitespace-nowrap">
                          {c.createdAt
                            ? new Date(c.createdAt).toLocaleDateString()
                            : "—"}
                        </td>

                        <td
                          className="p-2 sm:p-3 pr-4 sm:pr-6 w-10 sm:w-14"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {activeTab === 'all' ? (
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleArchiveClick(c.id);
                                    }}
                                  >
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                  </DropdownMenuItem>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleUnarchiveClick(c.id);
                                      }}
                                    >
                                      <ArchiveRestore className="mr-2 h-4 w-4" />
                                      Unarchive
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(c.id, c.name);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
        </table>
      </TableShell>

          {/* ---------- Create Collection Dialog (full-screen) ---------- */}
          <AddCollectionDialog open={dialogOpen} onOpenChange={setDialogOpen} />

          {/* ---------- Delete Collection Dialog ---------- */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Collection</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete "{collectionToDelete?.name}"?
                  This action cannot be undone and will remove the collection and all its references.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete Collection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ---------- Bulk Action Bar ---------- */}
          <BulkActionBar
            selectedCount={selectedIds.size}
            actions={bulkActions}
            onClearSelection={clearSelection}
          />
        </div>
      </main>
    </div>
  );
}

// Export the component as CollectionsList to match import expectations
export { CollectionsPage as CollectionsList };
export default CollectionsPage;
