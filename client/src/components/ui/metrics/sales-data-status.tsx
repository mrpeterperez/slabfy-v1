// Purpose: Shared compact status text for sales data availability
// Usage: Show loading/no-data/not-enough/comps in tables consistently
import React from "react";

interface SalesDataStatusProps {
  loading?: boolean;
  salesCount?: number;
  minCount?: number; // threshold for "not enough"; default 1
  className?: string;
}

export function SalesDataStatus({ loading, salesCount = 0, minCount = 1, className = "" }: SalesDataStatusProps) {
  if (loading) return <div className={`text-xs text-muted-foreground ${className}`}>Fetching comps…</div>;
  if (!salesCount || salesCount <= 0) return <div className={`text-xs text-muted-foreground ${className}`}>No sales yet</div>;
  if (salesCount < (minCount ?? 1)) return <div className={`text-xs text-muted-foreground ${className}`}>Not enough comps</div>;
  return <div className={`text-xs text-muted-foreground ${className}`}>{salesCount} comps</div>;
}

export default SalesDataStatus;
