// 🤖 INTERNAL NOTE:
// Purpose: Buying Desk section for Event Detail, shows filtered buying sessions for this event
// Exports: BuyingDeskSection component
// Feature: events

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Event } from "shared/schema";
import { SessionsListTable } from "@/features/buying-desk-v0/components/session/sessions-list";
import { useSessionsList } from "@/features/buying-desk-v0/hooks/use-sessions-list";
import AddOfferDialog from "@/features/buying-desk-v0/components/dialogs/add-offer-dialog";

interface Props { event: Event }

export function BuyingDeskSection({ event }: Props) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Get sessions filtered by this event
  const { data: sessions = [], isLoading } = useSessionsList({ eventId: event.id });

  if (isLoading) {
    return (
      <div className="flex-1 min-w-0 w-full max-w-full">
        {/* Toolbar header */}
        <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px]">
          <div className="flex items-center justify-between gap-4 w-full">
            <h2 className="font-heading text-lg font-semibold text-foreground">Buy Sessions</h2>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Buy Session
            </Button>
          </div>
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-4 bg-muted rounded w-1/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
        <AddOfferDialog 
          isOpen={isDialogOpen} 
          onClose={() => setIsDialogOpen(false)}
          eventId={event.id}
        />
      </div>
    );
  }

  if (!sessions.length) {
    return (
      <div className="flex-1 min-w-0 w-full max-w-full">
        {/* Toolbar header */}
        <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px]">
          <div className="flex items-center justify-between gap-4 w-full">
            <h2 className="font-heading text-lg font-semibold text-foreground">Buy Sessions</h2>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Buy Session
            </Button>
          </div>
        </div>
        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="mb-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold mb-2">No Buy Sessions</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Start a new session to evaluate cards, stage assets, and move the best deals into your cart.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Buy Session
          </Button>
        </div>
        <AddOfferDialog 
          isOpen={isDialogOpen} 
          onClose={() => setIsDialogOpen(false)}
          eventId={event.id}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 min-w-0 w-full max-w-full">
      {/* Toolbar header */}
      <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px]">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Buy Sessions</h2>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Buy Session
          </Button>
        </div>
      </div>
      {/* Content */}
      <div className="p-6">
        <SessionsListTable className="mt-0" eventId={event.id} />
      </div>
      <AddOfferDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)}
        eventId={event.id}
      />
    </div>
  );
}
