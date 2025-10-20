/**
 * ChartSkeleton Component
 * 
 * Purpose: Loading skeleton for trading chart to prevent loading delays
 * Exports: ChartSkeleton (default)
 * Feature: asset-details/trading-chart
 * 
 * Usage: Shows immediately while chart data loads
 */

export default function ChartSkeleton() {
  return (
    <div className="w-full h-full relative">
      {/* Chart Legend Skeleton */}
      <div className="absolute top-3 left-3 z-10">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded" />
          <div className="flex items-center gap-3">
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            <div className="flex items-center gap-1">
              <div className="h-2 w-8 bg-muted animate-pulse rounded-full" />
              <div className="h-4 w-8 bg-muted animate-pulse rounded" />
            </div>
          </div>
          <div className="h-3 w-20 bg-muted animate-pulse rounded" />
        </div>
      </div>

      {/* Chart Area Skeleton */}
      <div className="w-full h-full bg-muted/30 rounded-lg border border-dashed flex items-center justify-center">
        <div className="text-center">
          <div className="h-4 w-32 bg-muted animate-pulse rounded mx-auto mb-2" />
          <div className="h-3 w-24 bg-muted animate-pulse rounded mx-auto" />
        </div>
      </div>

      {/* Time Range Selector Skeleton */}
      <div className="mt-4 flex justify-center">
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
          {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((range) => (
            <div
              key={range}
              className="h-8 w-12 bg-muted animate-pulse rounded"
            />
          ))}
        </div>
      </div>
    </div>
  );
}