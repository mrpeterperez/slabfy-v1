import { TrendingDown } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

export function NoMarketData() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1.5 text-muted-foreground cursor-help">
          <TrendingDown className="h-3.5 w-3.5" />
          <span className="text-xs">No data</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>No market activity found</p>
      </TooltipContent>
    </Tooltip>
  );
}
