// 🤖 INTERNAL NOTE:
// Purpose: Visual badge showing auto-accept status for scanned cards
// Exports: AutoAcceptBadge component
// Feature: buying-desk-v0
// Dependencies: ui components

import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AutoAcceptBadgeProps {
  hasOfferPrice: boolean;
  marketData?: {
    liquidity?: string;
    confidence?: number;
  };
}

export function AutoAcceptBadge({ hasOfferPrice, marketData }: AutoAcceptBadgeProps) {
  // Auto-accepted: offer price was automatically calculated and set
  if (hasOfferPrice) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className="bg-success hover:bg-success/90 text-success-foreground gap-1">
              <CheckCircle className="w-3 h-3" />
              <span>Auto-Accepted</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs max-w-[200px]">
              This card passed all filters and was automatically priced based on your buying desk settings.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Needs review: no offer price set yet (manual review required)
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-700 dark:text-yellow-300 gap-1">
            <AlertCircle className="w-3 h-3" />
            <span>Needs Review</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs max-w-[200px] space-y-1">
            <p className="font-medium">Manual review required</p>
            {marketData?.liquidity && (
              <p className="text-muted-foreground">
                Liquidity: {marketData.liquidity} | Confidence: {marketData.confidence || 0}%
              </p>
            )}
            <p className="text-muted-foreground">
              Set offer price manually or adjust your auto-accept filters in settings.
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
