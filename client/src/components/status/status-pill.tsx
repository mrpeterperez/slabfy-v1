import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, Archive, type LucideIcon } from "lucide-react";

export type SimpleStatus = "active" | "archived";

type Cfg = { label: string; icon: LucideIcon; className: string };

const CONFIG: Record<SimpleStatus, Cfg> = {
  active: {
    label: "Active",
    icon: CheckCircle2,
    className:
      "border-emerald-500/25 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  },
  archived: {
    label: "Archived",
    icon: Archive,
    className: "border-muted text-muted-foreground bg-muted/40",
  },
};

export function StatusPill({
  status,
  label,
  showIcon = true,
  size = "sm",
  className,
}: {
  status: SimpleStatus;
  label?: string;
  showIcon?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const cfg = CONFIG[status];
  const Icon = cfg.icon;
  const sizeClasses = size === "sm" ? "h-5 px-2 text-[10px] gap-1" : "h-6 px-2.5 text-xs gap-1.5";

  return (
    <Badge
      variant="outline"
      className={cn("inline-flex items-center rounded-full border", sizeClasses, cfg.className, className)}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      <span className="font-medium">{label ?? cfg.label}</span>
    </Badge>
  );
}

// Map domain-specific strings to simple Active/Archived for top-level labeling.
export function normalizeSimpleStatus(input: string | null | undefined): SimpleStatus {
  const v = String(input ?? "").toLowerCase();
  if (["archived", "inactive", "deleted", "disabled"].includes(v)) return "archived";
  return "active";
}
