// 🤖 INTERNAL NOTE:
// Purpose: Reusable status pill component for analytics transaction types (sales, purchase, etc)
// Exports: TransactionStatusPill component, TransactionStatus type
// Feature: analytics (shared component)
// Dependencies: @/components/ui/badge, lucide-react, tailwind-merge

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, HelpCircle } from "lucide-react";

export type TransactionStatus = "sales" | "purchase" | "unknown";

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
}

const STATUS_CONFIG: Record<TransactionStatus, StatusConfig> = {
  sales: {
    label: "Sale",
    icon: ArrowUpRight,
    className: "border-green-500/25 text-green-600 dark:text-green-400 bg-green-500/10",
  },
  purchase: {
    label: "Purchase",
    icon: ArrowDownLeft,
    className: "border-blue-500/25 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  unknown: {
    label: "Unknown",
    icon: HelpCircle,
    className: "border-gray-400/25 text-gray-500 bg-gray-400/10",
  },
};

export function TransactionStatusPill({ type, className }: { type: TransactionStatus; className?: string }) {
  const config = STATUS_CONFIG[type] || STATUS_CONFIG.unknown;
  const Icon = config.icon;
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium transition-colors",
        config.className,
        className
      )}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}
