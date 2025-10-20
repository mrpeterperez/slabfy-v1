// 🤖 INTERNAL NOTE:
// Purpose: Summary cards component for events page  
// Exports: EventsSummaryCards component
// Feature: events
// Dependencies: @/components/ui/card, @/features/events/hooks/use-events

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEventsSummary } from "@/features/events/hooks/use-events";

interface EventsSummaryCardsProps {
  loading?: boolean;
}

export function EventsSummaryCards({ loading }: EventsSummaryCardsProps) {
  const { data: summary, isLoading: summaryLoading } = useEventsSummary();
  
  const isLoading = loading || summaryLoading;

  const fmtCurrency = new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" });
  
  const summaryCards = [
    { title: "Total Events", value: isLoading ? null : summary?.totalEvents?.toString() || "0" },
    { title: "Total Revenue", value: isLoading ? null : fmtCurrency.format(summary?.totalRevenue || 0) },
    { title: "Cards Sold", value: isLoading ? null : summary?.totalSold?.toString() || "0" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
      {summaryCards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted rounded animate-pulse" />
            ) : (
              <div className="text-2xl font-bold">{card.value}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}