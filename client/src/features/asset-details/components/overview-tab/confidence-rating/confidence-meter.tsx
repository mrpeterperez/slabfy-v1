/**
 * ConfidenceMeter Component
 * 
 * Purpose: Visual confidence rating display with color-coded meter
 * Exports: ConfidenceMeter (default)
 * Feature: asset-details/confidence-rating
 * 
 * Usage: Displays confidence percentage from server-side pricing API
 */
import { Info } from "lucide-react";
import { ResponsiveTooltip } from "@/components/ui/responsive-tooltip";

interface ConfidenceMeterProps {
  confidence: number; // 0-100 percentage from pricing API
  salesCount?: number;
  className?: string;
}

export default function ConfidenceMeter({ 
  confidence, 
  salesCount = 0,
  className = "" 
}: ConfidenceMeterProps) {

  // Determine color based on confidence percentage
  const getColor = (level: number) => {
    if (level >= 70) return 'green';
    if (level >= 40) return 'yellow';
    return 'red';
  };
  const color = getColor(confidence);

  // Tooltip content for price reliability
  const tooltipContent = (
    <div>
      <p className="font-medium mb-2">Price Reliability</p>
      <div className="space-y-1 text-xs">
        <p>Based on recent sales activity (90 days)</p>
        <p className="text-muted-foreground">
          {confidence >= 70 ? 'High reliability - Consistent recent pricing with adequate volume' :
           confidence >= 40 ? 'Medium reliability - Some recent activity with moderate price stability' :
           'Low reliability - Limited recent sales or high price volatility'}
        </p>
        <p className="text-muted-foreground mt-2">
          Total sales history: {salesCount} records
        </p>
      </div>
    </div>
  );

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Confidence Percentage */}
      <div className={`text-sm font-semibold ${
  color === 'green' ? 'text-success' :
  color === 'yellow' ? 'text-warning' :
  'text-destructive'
      }`}>
        {confidence}%
      </div>
      {/* Enhanced Visual Bar */}
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 border rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ease-out ${
              color === 'green' ? 'bg-gradient-to-r from-green-400 to-green-600' :
              color === 'yellow' ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
              'bg-gradient-to-r from-red-400 to-red-600'
            }`}
            style={{ width: `${confidence}%` }}
          />
        </div>

        {/* Confidence Level Text */}
        <span className={`text-xs font-medium ${
          color === 'green' ? 'text-success' :
          color === 'yellow' ? 'text-warning' :
          'text-destructive'
        }`}>
          {confidence >= 70 ? 'High' :
           confidence >= 40 ? 'Medium' :
           'Low'}
        </span>
      </div>
      
      {/* Responsive Info Tooltip */}
      <ResponsiveTooltip
        title="Price Reliability"
        content={tooltipContent}
        trigger={<Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors" />}
      />

    </div>
  );
}