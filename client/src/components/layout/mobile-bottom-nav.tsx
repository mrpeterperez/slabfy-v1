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
  Users,
  BarChart3,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
    if (typeof path !== "string") return false;
    
    // Show on these top-level pages only
    const topLevelPages = [
      "/dashboard",
      "/my-portfolio",
      "/buying-desk",
      "/events",
      "/consignments",
      "/collections",
      "/contacts",
      "/analytics",
      "/ai-agent",
      "/settings/show-storefront",
    ];
    
    // Check if we're on a top-level page (exact match or just the base path)
    for (const page of topLevelPages) {
      if (path === page) return true;
    }
    
    // Hide on detail pages (pages with IDs in the path)
    // Examples: /events/123, /buying-desk/abc-def, /consignments/456/details
    const detailPagePatterns = [
      /^\/events\/[^\/]+/,           // /events/:id...
      /^\/buying-desk\/[^\/]+/,      // /buying-desk/:id...
      /^\/consignments\/[^\/]+/,     // /consignments/:id...
      /^\/collections\/[^\/]+/,      // /collections/:id...
      /^\/contacts\/[^\/]+/,         // /contacts/:id...
      /^\/assets\/[^\/]+/,           // /assets/:id...
    ];
    
    return !detailPagePatterns.some(pattern => pattern.test(path));
  }, [path]);

  // Context-aware floating action button config
  const floatingAction = useMemo(() => {
    if (typeof path !== "string") return null;

    if (path === "/my-portfolio") {
      return {
        label: "Add Asset",
        eventName: "slabfy:add-asset"
      };
    }
    if (path === "/events") {
      return {
        label: "Add Show",
        eventName: "slabfy:add-event"
      };
    }
    if (path === "/consignments") {
      return {
        label: "Add Consignment",
        eventName: "slabfy:add-consignment"
      };
    }
    if (path === "/collections") {
      return {
        label: "Add Collection",
        eventName: "slabfy:add-collection"
      };
    }
    if (path === "/buying-desk") {
      return {
        label: "Add Session",
        eventName: "slabfy:add-buy-session"
      };
    }
    if (path === "/contacts") {
      return {
        label: "Add Contact",
        eventName: "slabfy:add-contact"
      };
    }

    return null;
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
    <div className="lg:hidden">
      {/* Spacer to prevent content from being hidden behind the bar if pages forget padding */}
      <div className="h-0" aria-hidden />
      <nav
        className="fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
        role="navigation"
        aria-label="Primary"
      >
        <div className="mx-auto max-w-screen-md">
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

            {/* Center: AI Agent (primary center icon) */}
            <div className="flex items-center justify-center">
              <button
                onClick={() => setLocation('/ai-agent')}
                aria-label="AI Agent"
                className="relative -mt-6 h-12 w-12 rounded-full bg-gradient-to-b from-zinc-900 to-zinc-800 text-primary-foreground shadow-md ring-4 ring-background flex items-center justify-center"
              >
                <Bot className="h-6 w-6 text-white" aria-hidden />
              </button>
            </div>

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
                  className="min-w-[200px] rounded-xl border bg-background shadow-lg px-1 py-1.5"
                >
                  <DropdownMenuItem onClick={() => setLocation("/buying-desk")}>
                    <Handshake className="h-4 w-4 mr-2" />
                    Buying Desk
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/settings/show-storefront")}>
                    <Store className="h-4 w-4 mr-2" />
                    Show Storefront
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/consignments")}>
                    <Boxes className="h-4 w-4 mr-2" />
                    Consignments
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/collections")}>
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Collections
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation("/contacts")}>
                    <Users className="h-4 w-4 mr-2" />
                    Contacts
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation("/analytics")}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        {/* Safe area padding */}
        <div className="pb-[env(safe-area-inset-bottom)]" aria-hidden />
        {/* Floating (+) FAB at bottom-right - context-aware */}
        {floatingAction ? (
          <button
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent(floatingAction.eventName));
              } catch {}
            }}
            aria-label={floatingAction.label}
            className="fixed right-4 bottom-20 z-60 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/95 transition-colors"
          >
            <Plus className="h-6 w-6" aria-hidden />
          </button>
        ) : null}
      </nav>
      {/* Reserve space for the bar to avoid overlap (approximate height) */}
      <div className="h-16" aria-hidden />
    </div>
  );
}

export default MobileBottomNav;
