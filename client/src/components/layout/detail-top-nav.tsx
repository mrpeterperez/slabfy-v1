// 🤖 INTERNAL NOTE:
// Purpose: Horizontal top navigation for detail pages (replaces vertical left nav)
// Exports: DetailTopNav component
// Usage: Pass items array with label/path/icon and basePath for active state detection
// Dependencies: wouter, shadcn navigation-menu, lucide-react
import React from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

export interface DetailNavItem {
  label: string;
  path: string; // relative path (e.g., '', '/earnings', '/settings')
  icon?: React.ComponentType<{ className?: string }>;
}

interface DetailTopNavProps {
  items: DetailNavItem[];
  basePath: string; // e.g., "/consignments/123"
  className?: string;
}

export function DetailTopNav({
  items,
  basePath,
  className,
}: DetailTopNavProps) {
  const [location, setLocation] = useLocation();

  const handleNavClick = (path: string) => {
    const fullPath = path === "" ? basePath : `${basePath}${path}`;
    setLocation(fullPath);
  };

  return (
    <div className={cn("border-b", className)}>
      <div className="px-4 py-3">
        <NavigationMenu className="max-w-none justify-start">
          <NavigationMenuList className="flex-wrap justify-start gap-1">
            {items.map((item) => {
              const fullPath =
                item.path === "" ? basePath : `${basePath}${item.path}`;
              const isActive =
                location === fullPath ||
                (item.path !== "" && location.startsWith(`${fullPath}/`));

              return (
                <NavigationMenuItem key={item.path || "root"}>
                  <button
                    onClick={() => handleNavClick(item.path)}
                    className={cn(
                      "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus:bg-primary/10 focus:text-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 text-muted-foreground",
                      isActive && "bg-primary/10 text-foreground font-medium",
                    )}
                  >
                    {item.icon && <item.icon className="mr-0 h-0 w-0" />}
                    {item.label}
                  </button>
                </NavigationMenuItem>
              );
            })}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}
