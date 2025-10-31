import { TrendingUp } from 'lucide-react';

export function ChartEmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center w-full h-full rounded-lg bg-background">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-12 h-12 rounded-full bg-card flex items-center justify-center">
          <TrendingUp className="h-6 w-6 text-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">No sales data available</p>
          <p className="text-sm text-muted-foreground">Data will appear when sales are found</p>
        </div>
      </div>
    </div>
  );
}
