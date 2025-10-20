// 🤖 INTERNAL NOTE:
// Purpose: "Storefront Not Available" error page for inactive/draft events
// Exports: StorefrontNotAvailable component
// Feature: sales-channels/show-storefront
// Dependencies: lucide-react icons, shadcn card

import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Calendar } from "lucide-react";

interface StorefrontNotAvailableProps {
  eventName?: string;
  eventStatus?: string;
  message?: string;
}

export function StorefrontNotAvailable({ 
  eventName, 
  eventStatus,
  message 
}: StorefrontNotAvailableProps) {
  const defaultMessage = "This event storefront is not currently available.";
  const statusMessage = eventStatus 
    ? `The event status is "${eventStatus}". Storefronts are only accessible for live events.`
    : "Please check back later or contact the event organizer.";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 pb-6 text-center space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>

          {/* Event Name */}
          {eventName && (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-sm font-medium">{eventName}</span>
              </div>
            </div>
          )}

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">
              Storefront Not Available
            </h1>
            <p className="text-muted-foreground">
              {message || defaultMessage}
            </p>
            {!message && (
              <p className="text-sm text-muted-foreground">
                {statusMessage}
              </p>
            )}
          </div>

          {/* Additional Info */}
          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              If you're the event organizer, make sure your event status is set to "live" 
              to enable the public storefront.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
