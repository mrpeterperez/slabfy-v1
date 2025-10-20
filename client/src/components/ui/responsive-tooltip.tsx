import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResponsiveTooltipProps {
  title?: string;
  content: React.ReactNode;
  trigger?: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Responsive tooltip that shows as a regular tooltip on desktop
 * and a bottom drawer on mobile for better UX
 */
export const ResponsiveTooltip: React.FC<ResponsiveTooltipProps> = ({
  title = "Information",
  content,
  trigger,
  className,
  side = "top"
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const defaultTrigger = (
    <button className={cn("text-muted-foreground hover:text-foreground transition-colors", className)}>
      <Info className="h-4 w-4" />
    </button>
  );

  return (
    <>
      {/* Desktop Tooltip (hidden on mobile) */}
      <div className="hidden lg:block">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {trigger || defaultTrigger}
            </TooltipTrigger>
            <TooltipContent side={side} className="max-w-xs">
              {content}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Mobile Drawer (hidden on desktop) */}
      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            {trigger || defaultTrigger}
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-lg max-h-[80vh] overflow-auto">
            <SheetHeader>
              <SheetTitle className="text-left">{title}</SheetTitle>
            </SheetHeader>
            <div className="mt-4 text-sm text-muted-foreground">
              {content}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
};
