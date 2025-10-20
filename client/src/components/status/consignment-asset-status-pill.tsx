// 🤖 INTERNAL NOTE:
// Purpose: Production-ready status pill for consignment assets following slabfyrules
// Exports: ConsignmentAssetStatusPill component, getStatusConfig function
// Feature: my-consignments (shared component)
// Dependencies: @/components/ui/badge, shared/schema, lucide-react

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ConsignmentAssetStatus } from "@shared/schema";
import { 
  FileText,
  CheckCircle, 
  Pause, 
  DollarSign,
  RotateCcw,
  type LucideIcon 
} from "lucide-react";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  variant: "default" | "secondary" | "destructive" | "outline";
  className: string;
}

// Production-ready status configuration using CSS custom properties
const STATUS_CONFIG: Record<ConsignmentAssetStatus, StatusConfig> = {
  draft: {
    label: "Draft",
    icon: FileText,
    variant: "outline",
    className: "border-blue-200 text-blue-700 bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/20",
  },
  active: {
    label: "Active", 
    icon: CheckCircle,
    variant: "default",
    className: "border-green-200 text-green-700 bg-green-50 dark:border-green-800 dark:text-green-300 dark:bg-green-950/20",
  },
  on_hold: {
    label: "On Hold",
    icon: Pause,
    variant: "secondary", 
    className: "border-yellow-200 text-yellow-700 bg-yellow-50 dark:border-yellow-800 dark:text-yellow-300 dark:bg-yellow-950/20",
  },
  sold: {
    label: "Sold",
    icon: DollarSign,
    variant: "default",
    className: "border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:bg-emerald-950/20",
  },
  returned: {
    label: "Returned",
    icon: RotateCcw,
    variant: "outline",
    className: "border-gray-200 text-gray-700 bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:bg-gray-950/20",
  },
};

interface ConsignmentAssetStatusPillProps {
  status: ConsignmentAssetStatus;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ConsignmentAssetStatusPill({
  status,
  showIcon = true,
  size = "sm", 
  className,
}: ConsignmentAssetStatusPillProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft; // Fallback to draft if status not found
  const Icon = config.icon;
  
  const sizeClasses = size === "sm" 
    ? "h-5 px-2 text-xs gap-1" 
    : "h-6 px-3 text-sm gap-1.5";

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "inline-flex items-center rounded-full font-medium",
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

// Utility function for external use
export function getStatusConfig(status: ConsignmentAssetStatus): StatusConfig {
  return STATUS_CONFIG[status] || STATUS_CONFIG.draft;
}

// Status display labels for consistent usage
export function getStatusLabel(status: ConsignmentAssetStatus): string {
  return (STATUS_CONFIG[status] || STATUS_CONFIG.draft).label;
}