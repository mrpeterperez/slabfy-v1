// 🤖 INTERNAL NOTE:
// Purpose: Reusable status pill component for event statuses (upcoming, active, completed)
// Exports: EventStatusPill component, EventStatus type
// Feature: events (shared component)
// Dependencies: @/components/ui/badge, lucide-react, tailwind-merge

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, CheckCircle2, Radio, XCircle, type LucideIcon } from "lucide-react";

export type EventStatus = "upcoming" | "live" | "completed" | "cancelled";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const STATUS_CONFIG: Record<EventStatus, StatusConfig> = {
  upcoming: {
    label: "Upcoming",
    icon: Calendar,
    className: "border-blue-500/25 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  live: {
    label: "Live",
    icon: Radio,
    className: "border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "border-gray-400/25 text-gray-500 bg-gray-400/10",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    className: "border-red-400/25 text-red-500 bg-red-400/10",
  },
};

export function EventStatusPill({ 
  status, 
  showIcon = true,
  size = "sm",
  className 
}: { 
  status: EventStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const sizeClasses = size === "sm" 
    ? "h-5 px-2 text-xs gap-1" 
    : "h-6 px-3 text-sm gap-1.5";

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-full border font-medium transition-colors",
        sizeClasses,
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </Badge>
  );
}