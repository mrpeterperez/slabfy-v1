// 🤖 INTERNAL NOTE:
// Purpose: Main sessions list with responsive mobile/desktop views
// Exports: SessionsListTable component (default)
// Feature: buying-desk-v0
// Dependencies: session hooks, mobile/desktop components

import React, { useState } from "react";
import { useSessionsList, useDeleteSessionItem } from "../../hooks/use-sessions-list";
import { useArchiveBuyingSession, useRestoreBuyingSession } from "../../hooks/use-offers";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Plus, Archive } from "lucide-react";
import { SessionCard } from "./components/session-card";
import { SessionsTable } from "./components/sessions-table";

interface SessionsListProps { 
  className?: string;
  eventId?: string; // Filter sessions by event
  archived?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectAll?: (ids: string[]) => void;
  isAllSelected?: boolean;
  isSomeSelected?: boolean;
}

export function SessionsListTable({ 
  className, 
  eventId,
  archived,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  isAllSelected,
  isSomeSelected 
}: SessionsListProps) {
  const { data: sessions = [], isLoading, error } = useSessionsList({ archived, eventId });
  const deleteSession = useDeleteSessionItem();
  const archiveSession = useArchiveBuyingSession();
  const restoreSession = useRestoreBuyingSession();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; number: string } | null>(null);

  const handleDeleteClick = (id: string, number: string) => {
    setSessionToDelete({ id, number });
    setDeleteDialogOpen(true);
  };

  const handleArchiveClick = async (id: string) => {
    await archiveSession.mutateAsync(id);
  };

  const handleRestoreClick = async (id: string) => {
    await restoreSession.mutateAsync(id);
  };

  const handleConfirmDelete = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteSession.mutateAsync(sessionToDelete.id);
      toast({ title: "Success", description: "Session deleted successfully" });
      setDeleteDialogOpen(false);
      setSessionToDelete(null);
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete session", variant: "destructive" });
    }
  };

  const handleRowClick = (sessionId: string) => setLocation(`/buying-desk/${sessionId}`);

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(date));
  };

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <p className="text-destructive">Error loading sessions</p>
          <p className="text-sm text-muted-foreground">{error?.message || "Unknown error"}</p>
        </div>
      </div>
    );
  }

  // Empty state handling (if no data and not loading)
  if (!isLoading && (!sessions || sessions.length === 0)) {
    return (
      <div className={className}>
        {/* Mobile Cards */}
        <div className="block md:hidden">
          {archived ? (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Archive className="h-6 w-6" />
                </div>
                <p>No archived sessions</p>
                <p className="text-sm text-muted-foreground">Use the Actions menu to archive a session</p>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Plus className="h-6 w-6" />
                </div>
                <p>No buying sessions yet</p>
                <p className="text-sm text-muted-foreground">Start a new session to evaluate and make offers</p>
              </div>
            </div>
          )}
        </div>

        {/* Desktop Table - will handle its own empty state */}
        <SessionsTable
          sessions={[]}
          isLoading={false}
          archived={archived}
          onRowClick={handleRowClick}
          onDeleteClick={handleDeleteClick}
          formatDate={formatDate}
          selectedIds={selectedIds}
          onToggleSelection={onToggleSelection}
          onSelectAll={onSelectAll}
          isAllSelected={isAllSelected}
          isSomeSelected={isSomeSelected}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mobile Cards */}
      <div className="block md:hidden space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 bg-muted rounded animate-pulse" />
          ))
        ) : (
          sessions.map((item: any) => {
            const session = item.session || item;
            const contact = item.contact || item.seller;
            const event = item.event;
            const cartSummary = item.cartSummary;
            
            if (!session) return null;
            
            return (
              <SessionCard
                key={session.id}
                session={session}
                contact={contact}
                event={event}
                cartSummary={cartSummary}
                archived={archived}
                onRowClick={handleRowClick}
                onDeleteClick={handleDeleteClick}
                onArchiveClick={handleArchiveClick}
                onRestoreClick={handleRestoreClick}
                formatDate={formatDate}
              />
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <SessionsTable
        sessions={sessions}
        isLoading={isLoading}
        archived={archived}
        onRowClick={handleRowClick}
        onDeleteClick={handleDeleteClick}
        onArchiveClick={handleArchiveClick}
        onRestoreClick={handleRestoreClick}
        formatDate={formatDate}
        selectedIds={selectedIds}
        onToggleSelection={onToggleSelection}
        onSelectAll={onSelectAll}
        isAllSelected={isAllSelected}
        isSomeSelected={isSomeSelected}
      />

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Session</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete session "{sessionToDelete?.number}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleteSession.isPending}>
              {deleteSession.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SessionsListTable;