// 🤖 INTERNAL NOTE:
// Purpose: Confirmation dialog for deleting/archiving events with financial data protection
// Exports: DeleteEventDialog component
// Feature: events
// Dependencies: shadcn components, events hooks

import { AlertTriangle, Archive, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteEvent, useArchiveEvent } from "../../hooks/use-events";
import { Event } from "../../types/event-types";

interface DeleteEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
}

export function DeleteEventDialog({ open, onOpenChange, event }: DeleteEventDialogProps) {
  const deleteEvent = useDeleteEvent();
  const archiveEvent = useArchiveEvent();
  const [showArchiveInstead, setShowArchiveInstead] = useState(false);

  // Check if event has financial data that needs protection
  const hasFinancialData = event && 
    ((event.soldCount && event.soldCount > 0) || (event.purchasedCount && event.purchasedCount > 0));

  const handleDelete = () => {
    if (!event) return;

    deleteEvent.mutate(event.id, {
      onSuccess: () => {
        onOpenChange(false);
        setShowArchiveInstead(false);
      },
      onError: (error: any) => {
        // Backend will return 400 if event has financial data
        if (error?.shouldArchive) {
          setShowArchiveInstead(true);
        }
      },
    });
  };

  const handleArchive = () => {
    if (!event) return;

    archiveEvent.mutate(event.id, {
      onSuccess: () => {
        onOpenChange(false);
        setShowArchiveInstead(false);
      },
    });
  };

  if (!event) return null;

  // Already archived - show info message
  if (event.archived) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <AlertDialogTitle>Event Already Archived</AlertDialogTitle>
                <AlertDialogDescription className="text-left">
                  This event is already archived and hidden from your active events.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Archived events cannot be permanently deleted to preserve financial records and analytics data.
            </p>
            {hasFinancialData && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium">Protected Data:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {event.soldCount && event.soldCount > 0 && (
                    <li>• {event.soldCount} sale{event.soldCount > 1 ? 's' : ''} (${event.revenue?.toFixed(2) || '0.00'})</li>
                  )}
                  {event.purchasedCount && event.purchasedCount > 0 && (
                    <li>• {event.purchasedCount} purchase{event.purchasedCount > 1 ? 's' : ''} (${event.purchasedTotal?.toFixed(2) || '0.00'})</li>
                  )}
                </ul>
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              Okay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Show archive prompt if event has financial data
  if (hasFinancialData || showArchiveInstead) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Archive className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <AlertDialogTitle>Archive Show Instead</AlertDialogTitle>
                <AlertDialogDescription className="text-left">
                  This event has financial records that must be preserved.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="space-y-3 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium">Financial Data:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {event.soldCount && event.soldCount > 0 && (
                  <li>• {event.soldCount} sale{event.soldCount > 1 ? 's' : ''} (${event.revenue?.toFixed(2) || '0.00'})</li>
                )}
                {event.purchasedCount && event.purchasedCount > 0 && (
                  <li>• {event.purchasedCount} purchase{event.purchasedCount > 1 ? 's' : ''} (${event.purchasedTotal?.toFixed(2) || '0.00'})</li>
                )}
              </ul>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Archiving will:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✅ Keep all sales and purchase records</li>
                <li>✅ Preserve analytics data</li>
                <li>✅ Hide from active events list</li>
                <li>✅ Allow restoration anytime</li>
              </ul>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archiveEvent.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchive}
              disabled={archiveEvent.isPending}
              className="bg-blue-500 text-white hover:bg-blue-600"
            >
              {archiveEvent.isPending ? 'Archiving...' : 'Archive Show'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Show delete confirmation for clean events
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Show</AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                Are you sure you want to permanently delete "{event.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteEvent.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteEvent.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteEvent.isPending ? 'Deleting...' : 'Delete Show'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}