import * as React from 'react';
import { Liquidity, liquidityExitTime, liquidityLabel, liquidityLevel } from './metrics';

interface Props {
  value?: string | Liquidity;
  showExitTime?: boolean; // default true
  showBars?: boolean; // default true
  showTooltip?: boolean; // default false - only show in specific cards
  className?: string;
}

export const LiquidityIndicator: React.FC<Props> = React.memo(({ value, showExitTime = true, showBars = true, showTooltip = false, className = '' }) => {
  const key = (value?.toString().toLowerCase() as Liquidity) || 'unknown';
  const level = liquidityLevel[key] ?? 0;
  const label = liquidityLabel[key];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}> 
      <div className="flex flex-col items-center" title={`Exit: ${liquidityExitTime[key]}`}>
        <div className="flex items-center gap-2">
          {showBars && (
            <div className="flex items-end gap-0.5 text-foreground/70">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={`w-1.5 rounded-sm ${i < level ? 'bg-foreground/70' : 'bg-muted-foreground/20'}`} style={{ height: `${6 + i * 2}px` }} />
              ))}
            </div>
          )}
          <span className="text-xs font-medium">{label}</span>
        </div>
        {showExitTime && (
          <div className="mt-1 text-[10px] text-muted-foreground leading-tight text-center">
            {liquidityExitTime[key] || '—'}
          </div>
        )}
      </div>
    </div>
  );
});

export default LiquidityIndicator;
