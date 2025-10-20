// 🤖 INTERNAL NOTE:
// Purpose: Reusable status pill component for buy session statuses with consistent colors and styling
// Exports: BuySessionStatusPill component, BuySessionStatus type
// Feature: buying-desk (shared component)
// Dependencies: @/components/ui/badge, lucide-react, tailwind-merge
// Updated: 2025-10-02 - Simplified to active/closed (80/20 rule)

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  CircleDot,
  CheckCircle2, 
  type LucideIcon
} from "lucide-react";

// Simplified status - just active or closed (80/20 rule)
export type BuySessionStatus = "active" | "closed";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const STATUS_CONFIG: Record<BuySessionStatus, StatusConfig> = {
  active: {
    label: "Active",
    icon: CircleDot,
    className: "border-blue-500/25 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  closed: {
    label: "Closed",
    icon: CheckCircle2,
    className: "border-muted text-muted-foreground bg-muted/40",
  },
};

export function BuySessionStatusPill({
  status,
  label,
  showIcon = true,
  size = "sm",
  className,
}: {
  status: BuySessionStatus;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  // Guard against invalid status values - default to active for safety
  const safeStatus: BuySessionStatus = status === "closed" ? "closed" : "active";
  const config = STATUS_CONFIG[safeStatus];
  const Icon = config.icon;
  const sizeClasses = size === "sm" ? "h-5 px-2 text-[10px] gap-1" : "h-6 px-2.5 text-xs gap-1.5";

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-full border", 
        sizeClasses, 
        config.className, 
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span className="font-medium">{label ?? config.label}</span>
    </Badge>
  );
}