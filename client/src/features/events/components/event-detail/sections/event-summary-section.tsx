// 🤖 INTERNAL NOTE:
// Purpose: Overview section for Event Detail showing summary/KPIs
// Exports: EventSummarySection component
// Feature: events

import type { Event } from "shared/schema";

interface Props { event: Event }

export function EventSummarySection({ event }: Props) {
  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Quick summary of performance for <span className="font-medium text-foreground">{event.name}</span>.
      </div>
      {/* Add deeper overview widgets here as we implement */}
    </div>
  );
}
