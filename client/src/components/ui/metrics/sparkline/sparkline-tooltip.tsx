import React from 'react';

interface Props { actualApiAverage?: number; isUsingAllTime?: boolean; }

export const SparklineTooltip: React.FC<any> = ({ active, payload, label, actualApiAverage, isUsingAllTime }: any & Props) => {
  if (!active || !payload || !payload.length) return null;
  const price = payload[0].value;
  return (
    <div className="rounded bg-background border shadow px-2 py-1 text-xs">
      <div className="font-medium">${price?.toFixed(2)}</div>
      {actualApiAverage != null && (
        <div className="text-muted-foreground">Avg: ${actualApiAverage.toFixed(2)}</div>
      )}
      {isUsingAllTime && <div className="text-[10px] text-amber-600 mt-0.5">All-time data</div>}
    </div>
  );
};

export default SparklineTooltip;
