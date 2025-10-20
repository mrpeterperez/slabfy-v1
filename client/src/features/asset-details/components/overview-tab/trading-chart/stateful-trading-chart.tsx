/**
 * StatefulTradingChart Component
 * 
 * Wrapper component that manages time range state internally.
 * Fixes the issue where 3M, YTD, and 1Y filters don't work properly.
 */

import { useState } from 'react';
import TradingChart from './trading-chart';
import type { TimeRange } from './utils/time-range-filter';
import type { Asset } from '@shared/schema';
import type { SalesRecord } from '@shared/sales-types';
import type { TradingChartData } from './types';

interface StatefulTradingChartProps {
  data?: TradingChartData[];
  cardData?: Asset | null;
  symbolName?: string;
  averagePrice?: number;
  className?: string;
  onIntervalChange?: (interval: TimeRange) => void;
  salesData?: SalesRecord[];
  isLoadingSales?: boolean;
  salesCount?: number;
  liquidityRating?: string;
  initialTimeRange?: TimeRange;
}

export default function StatefulTradingChart({
  initialTimeRange = '1M',
  ...props
}: StatefulTradingChartProps) {
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>(initialTimeRange);

  return (
    <TradingChart
      {...props}
      selectedTimeRange={selectedTimeRange}
      onTimeRangeChange={setSelectedTimeRange}
    />
  );
}