import { Info } from 'lucide-react';

interface LiquidityIndicatorProps {
  liquidity: string;
  salesCount?: number;
  className?: string;
}

export function LiquidityIndicator({ 
  liquidity, 
  salesCount = 0,
  className = "" 
}: LiquidityIndicatorProps) {

  const normalizedRating = (liquidity || '').toLowerCase();
    
  const getColor = (status: string) => {
    switch (status) {
  case 'fire': return 'text-destructive';
  case 'hot': return 'text-warning';
  case 'warm': return 'text-brand';
  case 'cool': return 'text-muted-foreground';
  case 'cold': return 'text-muted-foreground';
  default: return 'text-muted-foreground';
    }
  };

  const getEmoji = (status: string) => {
    switch (status) {
      case 'fire': return '🔥';
      case 'hot': return '⚡';
      case 'warm': return '💧';
      case 'cool': return '❄️';
      case 'cold': return '🧊';
      default: return '❓';
    }
  };

  const getPercentage = (status: string): number => {
    switch (status.toLowerCase()) {
      case "fire":
        return 85;
      case "hot":
        return 70;
      case "warm":
        return 50;
      case "cool":
        return 30;
      case "cold":
        return 15;
      default:
        return 0;
    }
  };

  const color = getColor(normalizedRating);
  const emoji = getEmoji(normalizedRating);
  const percentage = getPercentage(normalizedRating);
  const rating = normalizedRating.toUpperCase();

  // Add bar indicator logic
  const getLiquidityLevel = (liquidity: string): number => {
    switch (liquidity?.toLowerCase()) {
      case "fire":
        return 5;
      case "hot":
        return 4;
      case "warm":
        return 3;
      case "cool":
        return 2;
      case "cold":
        return 1;
      default:
        return 0;
    }
  };

  const getBarColor = (index: number, level: number): string => {
  if (index >= level) return "bg-muted";

    // Traffic light system: Green (high) -> Yellow (medium) -> Orange (low) -> Red (very low)
  if (level >= 5) return "bg-success";      // Fire = High (5 bars)
  if (level >= 4) return "bg-success";      // Hot = High (4 bars)
  if (level >= 3) return "bg-warning";     // Warm = Medium (3 bars)
  if (level >= 2) return "bg-brand";     // Cool = Low (2 bars)
  if (level >= 1) return "bg-destructive";        // Cold = Very Low (1 bar)
  return "bg-muted";
  };

  const level = getLiquidityLevel(normalizedRating);
  const max = 5;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Bar Indicator with Percentage */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[...Array(max)].map((_, i) => (
            <div
              key={i}
              className={`w-0.5 h-3 rounded-sm ${getBarColor(i, level)}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground min-w-[28px] text-right">
          {percentage}%
        </span>
      </div>
      
      {/* Info Tooltip */}
      <div className="relative group">
        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                        opacity-0 group-hover:opacity-100 transition-opacity
                        bg-popover border rounded-md shadow-md p-3 w-64 max-w-[90vw] z-50">
          <div className="text-sm">
            <div className="font-medium mb-2">Market Liquidity:</div>
            <div className="text-xs space-y-1">
              <div>Based on trading frequency and market activity</div>
              <div className="text-muted-foreground mt-2">
                Market liquidity rating based on trading frequency. Higher percentages indicate more active trading and easier buying/selling.
              </div>
              <div className="text-muted-foreground text-xs mt-1">
                Recent sales: {salesCount} records
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}