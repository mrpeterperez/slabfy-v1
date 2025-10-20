import { formatCurrency } from '@/lib/utils';

interface UnrealizedGainProps { purchasePrice: number; currentValue: number; }

// Display-only: never shows a loading skeleton. If we lack purchase price we show a dash.
export function UnrealizedGain({ purchasePrice, currentValue }: UnrealizedGainProps) {

  // Return dash if no purchase price (e.g., consignment items)
  if (!purchasePrice || purchasePrice <= 0) {
    return (
      <div className="font-medium text-muted-foreground">—</div>
    );
  }

  const gain = currentValue - purchasePrice;
  const percentage = (gain / purchasePrice) * 100;
  
  const isPositive = gain >= 0;
  const gainColor = isPositive ? 'text-green-600' : 'text-red-600';

  return (
    <div className="text-right">
      <div className={`font-medium ${gainColor}`}>
        {isPositive ? '+' : ''}{formatCurrency(gain)}
      </div>
      <div className={`text-[11px] ${gainColor}`}>
        {isPositive ? '+' : ''}{percentage.toFixed(1)}%
      </div>
    </div>
  );
}