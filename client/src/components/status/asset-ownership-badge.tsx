// 🤖 INTERNAL NOTE:
// Purpose: Badge component for asset ownership status with sold state tracking
// Exports: AssetOwnershipBadge component, OwnershipStatus type
// Feature: asset ownership
// Dependencies: @/components/ui/badge, lucide-react, @/lib/utils

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  Handshake, 
  type LucideIcon 
} from "lucide-react";

export type OwnershipStatus = "own" | "consignment" | "sold";

interface StatusConfig {
  label: string;
  icon: LucideIcon;
  className: string;
}

const STATUS_CONFIG: Record<OwnershipStatus, StatusConfig> = {
  own: {
    label: "Owner",
    icon: DollarSign,
    className: "border-blue-500/25 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  consignment: {
    label: "Consignment",
    icon: Handshake,
    className: "border-yellow-500/25 text-yellow-600 dark:text-yellow-500 bg-yellow-500/10",
  },
  sold: {
    label: "Sold",
    icon: DollarSign,
    className: "border-green-500/25 text-green-600 dark:text-green-400 bg-green-500/10",
  },
};

interface AssetOwnershipBadgeProps {
  status: OwnershipStatus;
  soldPrice?: number | null;
  soldDate?: string | Date | null;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Asset ownership badge that only displays for non-owner statuses.
 * Shows sold price for sold assets, following clean ownership status design.
 */
export function AssetOwnershipBadge({
  status,
  soldPrice,
  soldDate,
  showIcon = true,
  size = "sm",
  className,
}: AssetOwnershipBadgeProps) {
  // Only show badge for non-owner status (consignment or sold)
  if (status === "own") {
    return null;
  }

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const sizeClasses = size === "sm" 
    ? "h-5 px-2 text-[10px] gap-1" 
    : "h-6 px-2.5 text-xs gap-1.5";

  // Format sold price for display
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Generate label based on status
  const getLabel = () => {
    if (status === "sold" && soldPrice && soldPrice > 0) {
      return `${config.label} ${formatPrice(soldPrice)}`;
    }
    return config.label;
  };

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
      <span className="font-medium">{getLabel()}</span>
    </Badge>
  );
}