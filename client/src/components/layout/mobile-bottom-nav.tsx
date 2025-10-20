import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Home,
  Wallet,
  Bot,
  Calendar,
  MoreHorizontal,
  FolderOpen,
  Boxes,
  ShoppingCart,
  Plus,
  Package,
  DollarSign,
  Handshake,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

type NavItem = {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

export function MobileBottomNav() {
  const [path, setLocation] = useLocation();
  // no local open state needed with DropdownMenu

  // Render only on top-level parent pages (not on auth, onboarding, or detail views)
  const isVisible = useMemo(() => {
    const prefixes = [
      "/dashboard",
      "/my-portfolio",
      "/buying-desk",
      "/events",
      "/consignments",
      "/collections",
      "/analytics",
      "/ai-agent",
    ];
    return typeof path === "string" && prefixes.some((p) => path.startsWith(p));
  }, [path]);

  // If currently inside /events/:id[/...], link Show Page to that event id; otherwise to /events
  const showPagePath = useMemo(() => {
    if (typeof path !== "string") return "/events";
    const m = path.match(/^\/events\/(\d+|[a-zA-Z0-9-]+)(?:\b|\/|\?|#)/);
    return m ? `/events/${m[1]}` : "/events";
  }, [path]);

  // Use simplified bar only on event detail pages (/events/:id...), not on /events root
  const isEventRoute = useMemo(() => {
    if (typeof path !== "string") return false;
    return /^\/events\/([^\/?#]+)/.test(path);
  }, [path]);

  // Detect current event tab for highlighting
  const eventTab = useMemo(() => {
    if (!isEventRoute || typeof path !== "string") return "";
    const m = path.match(/^\/events\/([^\/?#]+)\/?([^\/?#]+)?/);
    return m && m[2] ? m[2] : "inventory";
  }, [isEventRoute, path]);

  const items: NavItem[] = [
    { key: "home", label: "Home", path: "/dashboard", icon: Home },
    { key: "assets", label: "My Portfolio", path: "/my-portfolio", icon: Wallet },
    { key: "shows", label: "Shows", path: "/events", icon: Calendar },
  ];

  if (!isVisible) return null;

  const go = (to: string) => () => setLocation(to);
  const isActive = (to: string) => path.startsWith(to);

  return (
    <div className="md:hidden">
      {/* Spacer to prevent content from being hidden behind the bar if pages forget padding */}
      <div className="h-0" aria-hidden />
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        role="navigation"
        aria-label="Primary"
      >
        <div className="mx-auto max-w-screen-sm">
          <div className={`grid items-center px-2 py-1 gap-1 ${isEventRoute ? "grid-cols-5" : "grid-cols-5"}`}>
            {/* Left block: Home/Assets when not on event; Inventory when on event */}
            {isEventRoute ? (
              <button
                onClick={go(`${showPagePath}/inventory`)}
                className={
                  "flex flex-col items-center justify-center py-2 text-xs transition-colors " +
                  (eventTab === "inventory" ? "text-primary" : "text-muted-foreground hover:text-foreground")
                }
              >
                <Package className="h-5 w-5" aria-hidden />
                <span className="mt-0.5 leading-none">Inventory</span>
              </button>
            ) : (
              items.slice(0, 2).map((it) => {
              const ActiveIcon = it.icon;
              const active = isActive(it.path);
              return (
                <button
                  key={it.key}
                  onClick={go(it.path)}
                  className={
                    "flex flex-col items-center justify-center py-2 text-xs transition-colors " +
                    (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
                  }
                >
                  <ActiveIcon className="h-5 w-5" aria-hidden />
                  <span className="mt-0.5 leading-none">{it.label}</span>
                </button>
              );
              })
            )}

            {/* Second block: Sold Items on event; Center AI Agent elsewhere (handled later) */}
            {isEventRoute ? (
              <button
                onClick={go(`${showPagePath}/sold-items`)}
                className={
                  "flex flex-col items-center justify-center py-2 text-xs transition-colors " +
                  (eventTab === "sold-items" ? "text-primary" : "text-muted-foreground hover:text-foreground")
                }
              >
                <DollarSign className="h-5 w-5" aria-hidden />
                <span className="mt-0.5 leading-none">Sold Items</span>
              </button>
            ) : null}

            {/* Center CTA (Add on event detail, AI Agent elsewhere) */}
            {isEventRoute ? (
              <div className="flex items-center justify-center">
                <button
                  onClick={() => {
                    try {
                      window.dispatchEvent(new CustomEvent('slabfy:add-to-event'));
                    } catch {}
                  }}
                  aria-label="Add Items"
                  className="relative -mt-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background flex items-center justify-center"
                >
                  <Plus className="h-5 w-5" aria-hidden />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <button
                  onClick={go("/ai-agent")}
                  aria-label="AI Agent"
                  className="relative -mt-6 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-md ring-4 ring-background flex items-center justify-center"
                >
                  <Bot className="h-5 w-5" aria-hidden />
                </button>
              </div>
            )}

      {/* Fourth block: Buy Sessions on event; Shows on parent pages */}
            {isEventRoute ? (
              <button
                onClick={go(`${showPagePath}/buy-sessions`)}
                className={
                  "flex flex-col items-center justify-center py-2 text-xs transition-colors " +
                  (eventTab === "buy-sessions" ? "text-primary" : "text-muted-foreground hover:text-foreground")
                }
              >
                <Handshake className="h-5 w-5" aria-hidden />
        <span className="mt-0.5 leading-none">Buy Sessions</span>
              </button>
            ) : (
              items.slice(2, 3).map((it) => {
                const ActiveIcon = it.icon;
                const active = isActive(it.path);
                return (
                  <button
                    key={it.key}
                    onClick={go(it.path)}
                    className={
                      "flex flex-col items-center justify-center py-2 text-xs transition-colors " +
                      (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
                    }
                  >
                    <ActiveIcon className="h-5 w-5" aria-hidden />
                    <span className="mt-0.5 leading-none">{it.label}</span>
                  </button>
                );
              })
            )}

            {/* More menu */}
            <div className="flex items-center justify-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex flex-col items-center justify-center py-2 text-xs text-muted-foreground hover:text-foreground"
                    aria-label="More"
                  >
                    <MoreHorizontal className="h-5 w-5" aria-hidden />
                    <span className="mt-0.5 leading-none">More</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="center"
                  className="min-w-[180px] rounded-xl border bg-background shadow-lg px-1 py-1.5"
                >
                  <DropdownMenuItem onClick={() => setLocation("/consignments")}>
                    Consignments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/collections")}>
                    Collections
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {/* Safe area padding */}
        <div className="pb-[env(safe-area-inset-bottom)]" aria-hidden />
      </nav>
      {/* Reserve space for the bar to avoid overlap (approximate height) */}
      <div className="h-16" aria-hidden />
    </div>
  );
}

export default MobileBottomNav;
