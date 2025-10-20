// 🤖 INTERNAL NOTE:
// Purpose: Small numeric badge for counts in tabs and labels
// Style: pill with border and bg-card to match design language

import * as React from "react";

interface CountBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  value?: number | null;
  hideZero?: boolean; // when true, do not show the badge for 0/null/undefined
}

export function CountBadge({ value = 0, hideZero = true, className = "", ...rest }: CountBadgeProps) {
  const num = typeof value === "number" && isFinite(value) ? Math.floor(value) : 0;
  if (hideZero && (!num || num <= 0)) return null;
  return (
    <span
      className={
        "inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full " +
        "bg-card text-muted-foreground border border-border text-xs font-semibold " +
        "leading-none " +
        className
      }
      {...rest}
    >
      {num}
    </span>
  );
}

export default CountBadge;
