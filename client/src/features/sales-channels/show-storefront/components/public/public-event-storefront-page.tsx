// 🤖 INTERNAL NOTE:
// Purpose: Public event storefront wrapper with status validation
// Exports: PublicEventStorefrontPage component
// Feature: sales-channels/show-storefront (multi-event architecture)
// Dependencies: wouter, react-query, StorefrontNotAvailable

import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { StorefrontNotAvailable } from "./storefront-not-available";
import { PublicStorefrontPage } from "./public-storefront-page";
import type { Event } from "@shared/schema";

export function PublicEventStorefrontPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const location = useLocation();
  const isPreview = location[0].includes('/preview');

  // Fetch event data with status validation
  const { data: event, isLoading, error } = useQuery({
    queryKey: ['/api/events/public', eventId],
    queryFn: async () => {
      const response = await fetch(`/api/events/public/${eventId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Event not found');
        }
        throw new Error('Failed to load event');
      }

      return await response.json() as Event;
    },
    enabled: !!eventId,
    retry: 1,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading storefront...</p>
        </div>
      </div>
    );
  }

  // Error state - Event not found
  if (error || !event) {
    return (
      <StorefrontNotAvailable
        message="Event not found"
      />
    );
  }

  // Status validation - Only "live" events are publicly accessible (unless preview mode)
  if (!isPreview && event.status !== 'live') {
    return (
      <StorefrontNotAvailable
        eventName={event.name}
        eventStatus={event.status || undefined}
        message={`This event storefront is not currently available.`}
      />
    );
  }

  // Success - Render storefront with eventId for inventory loading
  // The existing PublicStorefrontPage handles the rest (settings, inventory, cart)
  return <PublicStorefrontPage eventId={eventId} userId={event.userId} event={event} />;
}
