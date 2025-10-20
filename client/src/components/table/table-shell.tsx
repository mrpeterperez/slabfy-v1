import React from "react";
import { cn } from "@/lib/utils";

type TableShellProps = {
  isLoading: boolean;
  isEmpty: boolean;
  children: React.ReactNode; // Render the full <table> markup
  emptyState?: React.ReactNode;
  /** Tailwind class for outer container (defaults to border/rounded/bg-card) */
  containerClassName?: string;
  /** Optional class for the overflow wrapper */
  wrapperClassName?: string;
  /** Skeleton height (Tailwind h- classes or inline style via custom) */
  skeletonHeightClassName?: string; // e.g., "h-96"
};

/**
 * TableShell
 * - Standardizes table container (border/rounded/bg/overflow)
 * - Provides a consistent skeleton while loading
 * - Provides a slot for a custom empty state
 *
 * Usage:
 * <TableShell isLoading={loading} isEmpty={!items?.length} emptyState={<MyEmpty/>}>
 *   <table>...</table>
 * </TableShell>
 */
export function TableShell({
  isLoading,
  isEmpty,
  children,
  emptyState,
  containerClassName,
  wrapperClassName,
  skeletonHeightClassName = "h-96",
}: TableShellProps) {
  if (isLoading) {
    return (
      <div className={cn("border rounded-lg bg-card overflow-hidden", containerClassName)}>
        <div className={cn("bg-muted animate-pulse", skeletonHeightClassName)} />
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className={cn("border rounded-lg bg-card overflow-hidden", containerClassName)}>
        {emptyState ?? (
          <div className="py-12 text-center text-muted-foreground">No data</div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("border rounded-lg bg-card overflow-hidden", containerClassName)}>
      <div className={cn("overflow-x-auto rounded-lg", wrapperClassName)}>
        {children}
      </div>
    </div>
  );
}

export default TableShell;
