// 🤖 INTERNAL NOTE:
// Purpose: Reusable pill for collection visibility (Public/Private)
// Exports: CollectionVisibilityPill component
// Feature: collections (shared status component)

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Eye, LockKeyhole, type LucideIcon } from "lucide-react";

type Visibility = "public" | "private";

interface Cfg {
  label: string;
  icon: LucideIcon;
  className: string;
}

const CONFIG: Record<Visibility, Cfg> = {
  public: {
    label: "Public",
    icon: Eye,
    className:
      "border-blue-500/25 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  },
  private: {
    label: "Private",
    icon: LockKeyhole,
    className: "border-muted text-muted-foreground bg-muted/40",
  },
};

export function CollectionVisibilityPill({
  isPublic,
  label,
  showIcon = true,
  size = "sm",
  className,
}: {
  isPublic: boolean | null | undefined;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const key: Visibility = isPublic ? "public" : "private";
  const cfg = CONFIG[key];
  const Icon = cfg.icon;
  const sizeClasses =
    size === "sm" ? "h-5 px-2 text-[10px] gap-1" : "h-6 px-2.5 text-xs gap-1.5";

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center rounded-full border",
        sizeClasses,
        cfg.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span className="font-medium">{label ?? cfg.label}</span>
    </Badge>
  );
}
