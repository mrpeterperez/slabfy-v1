import { Info } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: number;
  salesCount?: number;
  className?: string;
}

export function ConfidenceIndicator({ 
  confidence, 
  salesCount = 0,
  className = "" 
}: ConfidenceIndicatorProps) {

  // Determine color based on confidence percentage
  const getColor = (level: number) => {
    if (level >= 70) return 'green';
    if (level >= 40) return 'yellow';
    return 'red';
  };
  const color = getColor(confidence);

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Confidence Percentage */}
      <div className={`text-sm font-medium ${
  color === 'green' ? 'text-success' :
  color === 'yellow' ? 'text-warning' :
  'text-destructive'
      }`}>
        {confidence}%
      </div>
      
      {/* Info Tooltip */}
      <div className="relative group">
        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 
                        opacity-0 group-hover:opacity-100 transition-opacity
                        bg-popover border rounded-md shadow-md p-3 w-64 max-w-[90vw] z-50">
          <div className="text-sm">
            <div className="font-medium mb-2">Price Reliability:</div>
            <div className="text-xs space-y-1">
              <div>Based on recent sales activity (90 days)</div>
              <div className="text-muted-foreground mt-2">
                {confidence >= 70 ? 'High reliability - Consistent recent pricing with adequate volume' :
                 confidence >= 40 ? 'Medium reliability - Some recent activity with moderate price stability' :
                 'Low reliability - Limited recent sales or high price volatility'}
              </div>
              <div className="text-muted-foreground text-sm mt-1">
                Total sales history: {salesCount} records
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}