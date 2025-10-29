// Show Card Component
// Purpose: Mobile-optimized card for displaying show/event details

import { Tag, DollarSign, Handshake } from "lucide-react";
import { EventStatusPill } from "@/components/status/event-status-pill";
import type { Event, EventStatus } from "@/features/events/types/event-types";
import { InventoryCountCell, SessionStatsCell, RevenueCell } from "@/pages/events/components/events-table-cells";

interface ShowCardProps {
  event: Event;
  onClick?: () => void;
}

export function ShowCard({ event, onClick }: ShowCardProps) {
  const formatDateDisplay = () => {
    const start = new Date(event.dateStart);
    const month = start.toLocaleDateString('en-US', { month: 'short' });
    const year = start.getFullYear();

    // Check if there's an end date and if it's different from start
    if (event.dateEnd) {
      const end = new Date(event.dateEnd);
      const startDay = start.getDate();
      const endDay = end.getDate();
      
      // Same month, different days
      if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
        return {
          month,
          dateRange: `${startDay}-${endDay}`,
          year: year.toString(),
        };
      }
    }

    // Single day or no end date
    return {
      month,
      dateRange: start.getDate().toString(),
      year: year.toString(),
    };
  };

  const { month, dateRange, year } = formatDateDisplay();

  return (
    <button
      onClick={onClick}
      className="w-full border-b text-left transition-colors"
    >
      <div className="flex gap-4 pt-0 p-4">
        {/* Date Card - Left Side */}
        <div className="flex-shrink-0 w-[88px] bg-background rounded-lg border flex flex-col items-center justify-center px-2 self-stretch">
          <div className="text-xs text-muted-foreground uppercase">{month}</div>
          <div className="text-xl font-bold leading-tight my-1">{dateRange}</div>
          <div className="text-xs text-muted-foreground">{year}</div>
        </div>

        {/* Content - Right Side */}
        <div className="flex-1 min-w-0">
          {/* Status Pill */}
          {event.status && (
            <div className="mb-2">
              <EventStatusPill status={event.status as EventStatus} size="sm" />
            </div>
          )}

          {/* Title */}
          <h3 className="font-heading font-bold text-lg leading-tight mb-1 truncate">
            {event.name}
          </h3>

          {/* Location */}
          {event.location && (
            <p className="text-sm text-muted-foreground truncate mb-3">
              {event.location}
            </p>
          )}

          {/* Metrics Row */}
          <div className="flex items-center gap-4 text-sm">
            {/* Inventory Count */}
            <div className="flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <InventoryCountCell id={event.id} />
            </div>

            {/* Revenue */}
            <div className="flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <RevenueCell event={event} />
            </div>

            {/* Buy Sessions */}
            <div className="flex items-center gap-1.5">
              <Handshake className="h-4 w-4 text-muted-foreground" />
              <SessionStatsCell id={event.id} />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
