/**
 * TimeRangeSelector Component
 * 
 * Purpose: Displays time range selection buttons for chart filtering
 * Exports: TimeRangeSelector (default)
 * Feature: asset-details/trading-chart
 * 
 * Usage: Clean minimal time range selector with subtle highlighting
 */
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { hasDataForTimeRange, type TimeRange, count30DaySales } from './utils/time-range-filter';
import { TradingChartData } from './types';
import { SalesRecord } from '@shared/sales-types';

interface TimeRangeSelectorProps {
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  salesData?: TradingChartData[];
  rawSalesData?: SalesRecord[]; // Add raw sales data for accurate counting
  className?: string;
}

export default function TimeRangeSelector({
  selectedRange,
  onRangeChange,
  salesData = [],
  rawSalesData = [],
  className = ''
}: TimeRangeSelectorProps) {
  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'];

  return (
    <TooltipProvider>
      <div className={`border-t border-border pt-3 pb-2 ${className}`}>
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-4 text-sm min-w-max px-1">
            {timeRanges.map((range) => {
              // Use unified calculation for 1M to match chart legend, fall back to chart data for other ranges
              let hasData: boolean;
              if (range === '1M' && rawSalesData?.length) {
                const count = count30DaySales(rawSalesData);
                hasData = count > 0;
              } else {
                hasData = hasDataForTimeRange(salesData, range);
              }

              const TimeRangeButton = (
                <button
                  key={range}
                  onClick={() => hasData && onRangeChange(range)}
                  disabled={!hasData}
                  className={`px-2 py-0.5 font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    !hasData
                      ? 'text-muted-foreground/40 cursor-not-allowed'
                      : selectedRange === range
                      ? 'text-success border-b border-success'
                      : 'text-muted-foreground hover:text-foreground cursor-pointer'
                  }`}
                >
                  {range}
                </button>
              );

              if (!hasData) {
                return (
                  <Tooltip key={range}>
                    <TooltipTrigger asChild>
                      {TimeRangeButton}
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>No sales data available for this time period</p>
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return TimeRangeButton;
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}