// 🤖 INTERNAL NOTE:
// Purpose: Reusable status pill component for consignment statuses with consistent colors and styling
// Exports: ConsignmentStatusPill component, ConsignmentStatus type
// Feature: my-consignments (shared component)
// Dependencies: @/components/ui/badge, lucide-react, tailwind-merge

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  CheckCircle2, 
  Pause, 
  Trophy, 
  Ban,
  type LucideIcon
} from "lucide-react";

export type ConsignmentStatus = 
  | "active" 
  | "paused" 
  | "completed" 
  | "cancelled";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const STATUS_CONFIG: Record<ConsignmentStatus, StatusConfig> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className: "border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
  paused: {
    label: "Paused",
    icon: Pause,
    className: "border-yellow-500/25 text-yellow-600 dark:text-yellow-500 bg-yellow-500/10",
  },
  completed: {
    label: "Completed",
    icon: Trophy,
    className: "border-blue-500/25 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className: "border-muted text-muted-foreground bg-muted/40",
  },
};

export function ConsignmentStatusPill({
  status,
  label,
  showIcon = true,
  size = "sm",
  className,
}: {
  status: ConsignmentStatus;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
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