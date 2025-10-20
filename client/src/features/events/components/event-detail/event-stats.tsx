// 🤖 INTERNAL NOTE:
// Purpose: Stats cards component for event details page matching events list layout exactly
// Exports: EventStatsCards component
// Feature: events
// Dependencies: @/components/ui for cards, event schema types

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Event } from "shared/schema";

interface EventStatsCardsProps {
  event: Event;
}

export function EventStatsCards({ event }: EventStatsCardsProps) {
  // Event-specific cards data - matches events list page structure but with event metrics
  const summaryCards = [
    {
      title: "Buying Desk",
      value: 0,
    },
    {
      title: "Sold",
      value: 0,
    },
    {
      title: "Revenue",
      value: "$0",
    },
    {
      title: "Profit",
      value: "$0",
    },
    {
      title: "Avg Buy",
      value: "$0",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      {summaryCards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
