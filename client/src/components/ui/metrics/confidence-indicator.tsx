import * as React from 'react';
import { clampPct, confidenceBarColor, confidenceTextColor, confidenceLabel, getConfidenceLevel } from './metrics';

interface Props {
  value: number; // 0-100
  showPercent?: boolean;
  bars?: number; // default 5
  className?: string;
}

export const ConfidenceIndicator: React.FC<Props> = React.memo(({ value, showPercent = false, bars = 5, className = '' }) => {
  const pct = clampPct(value);
  const level = getConfidenceLevel(pct);
  const filled = Math.round((pct / 100) * bars);
  const label = confidenceLabel[level];

  return (
    <div className={`flex items-center gap-2 ${className}`} title={`${pct}% (${label})`}>
      <div className="flex items-end gap-0.5">
        {Array.from({ length: bars }).map((_, i) => (
          <span key={i} className={`w-1.5 rounded-sm ${i < filled ? confidenceBarColor[level] : 'bg-muted-foreground/20'}`} style={{ height: `${6 + i * 2}px` }} />
        ))}
      </div>
      <span className={`text-xs ${confidenceTextColor[level]}`}>{label}</span>
      {showPercent && <span className="text-xs text-muted-foreground">{pct}%</span>}
    </div>
  );
});

export default ConfidenceIndicator;
