// 🤖 INTERNAL NOTE:
// Purpose: Reusable left navigation shell (vertical) with 24px icons and text-md labels
// Exports: LeftNav, type LeftNavItem
// Usage: Provide items, activeId, and onSelect; optional bottomItems rendered after a divider

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

export type LeftNavItem = {
  id: string;
  label: string;
  // Icon component from lucide-react or similar
  icon: React.ComponentType<{ className?: string }>;
};

type Props = {
  items: LeftNavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  bottomItems?: LeftNavItem[];
  className?: string;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
};

export function LeftNav({ items, activeId, onSelect, bottomItems, className, collapsible = false, collapsed = false, onToggle }: Props) {
  return (
    <div className={cn("p-0 pt-0 h-full flex flex-col", className)}>
      {collapsible && (
        <div className="px-2 py-2 border-b border-border">
          <button
            type="button"
            onClick={onToggle}
            className="w-full flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted h-8"
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? (
              <ChevronsRight className="h-4 w-4" />
            ) : (
              <ChevronsLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      )}
      <nav className="space-y-0 py-1 flex-1 overflow-y-auto">
        {items.map((item) => {
          const isActive = activeId === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelect?.(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left",
                isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              aria-label={item.label}
            >
              <Icon className={cn("h-6 w-6 flex-shrink-0", collapsed && "mx-auto")}/>
              {!collapsed && (
                <div className="font-medium">{item.label}</div>
              )}
            </button>
          );
        })}

        {bottomItems && bottomItems.length > 0 && (
          <>
            <div className="my-2 border-t" />
            {bottomItems.map((item) => {
              const isActive = activeId === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelect?.(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors text-left",
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                  aria-label={item.label}
                >
                  <Icon className={cn("h-6 w-6 flex-shrink-0", collapsed && "mx-auto")} />
                  {!collapsed && (
                    <div className="font-medium">{item.label}</div>
                  )}
                </button>
              );
            })}
          </>
        )}
      </nav>
    </div>
  );
}
