// 🤖 INTERNAL NOTE:
// Purpose: Global left navigation sidebar with collapsible rail, grouped items, profile, and theme toggle
// Exports: AppSidebar component (named export)
// Feature: layout
// Dependencies: shadcn/ui components, lucide-react, auth-provider, wouter
import * as React from "react";
import { Link, useLocation } from "wouter";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Plus,
  FolderKanban,
  ClipboardList,
  Library,
  Wrench,
  Calendar,
  HandCoins,
  DollarSign,
  Store,
  ShoppingBag,
  BarChart3,
  Settings,
  User as UserIcon,
  MoreHorizontal,
  MessageSquare,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { SmallLogo, Emblem } from "@/components/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import AddAssetModalSimple from "@/features/add-asset/components/add-asset-modal/add-asset-modal-simple";
import { AddCollectionDialog } from "@/features/collections/components/add-collection-dialog";
import { AddConsignmentDialog } from "@/features/my-consignments/components";
import { AddEventDialog } from "@/features/events/components/add-event/add-event-dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";

type NavLeaf = {
  label: string;
  href: string;
  icon: LucideIcon;
};

type NavGroup = {
  label: string;
  icon: LucideIcon;
  children: NavLeaf[];
};

type NavItem = NavLeaf | NavGroup;

function isGroup(item: NavItem): item is NavGroup {
  return (item as NavGroup).children !== undefined;
}

const topItems: NavItem[] = [
  { label: "Create New", href: "/coming-soon", icon: Plus },
  { label: "Chats", href: "/chats", icon: MessageSquare },
  { label: "My Portfolio", href: "/my-portfolio", icon: FolderKanban },
  { label: "Consignments", href: "/consignments", icon: ClipboardList },
  { label: "Collections", href: "/collections", icon: Library },
  { label: "Card Shows", href: "/events", icon: Calendar },
  { label: "Show Storefront", href: "/settings/show-storefront", icon: Store },
  { label: "Buying Desk", href: "/buying-desk", icon: HandCoins },
  {
    label: "Operations",
    icon: Wrench,
    children: [
      { label: "Contacts", href: "/contacts", icon: UserIcon },
      { label: "Analytics", href: "/analytics", icon: BarChart3 },
    ],
  },
];

const railWidth = 52;
const openWidth = 240;

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { setTheme } = useTheme();
  const [path, setLocation] = useLocation();
  // Initialize from storage; default expanded if no preference
  const [open, setOpen] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem("slabfy.sidebar:open");
      return raw ? raw === "true" : true;
    } catch {
      return true;
    }
  });
  // Local dialog state for "Create New" actions
  const [assetOpen, setAssetOpen] = React.useState(false);
  const [collectionOpen, setCollectionOpen] = React.useState(false);
  const [consignmentOpen, setConsignmentOpen] = React.useState(false);
  const [eventOpen, setEventOpen] = React.useState(false);

  const [groupsOpen, setGroupsOpen] = React.useState<Record<string, boolean>>(
    () => {
      try {
        const raw = localStorage.getItem("slabfy.sidebar:groups");
        return raw
          ? JSON.parse(raw)
          : { Operations: true };
      } catch {
        return { Operations: true };
      }
    },
  );

  React.useEffect(() => {
    try {
      localStorage.setItem("slabfy.sidebar:open", String(open));
    } catch {}
  }, [open]);

  // Global toggle listener (breadcrumbs button)
  React.useEffect(() => {
    const toggle = () => setOpen((v) => !v);
    const openHandler = () => setOpen(true);
    const collapseHandler = () => setOpen(false);
    window.addEventListener("slabfy:sidebar-toggle", toggle as any);
    window.addEventListener("slabfy:sidebar-open", openHandler as any);
    window.addEventListener("slabfy:sidebar-collapse", collapseHandler as any);
    return () => {
      window.removeEventListener("slabfy:sidebar-toggle", toggle as any);
      window.removeEventListener("slabfy:sidebar-open", openHandler as any);
      window.removeEventListener("slabfy:sidebar-collapse", collapseHandler as any);
    };
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem("slabfy.sidebar:groups", JSON.stringify(groupsOpen));
    } catch {}
  }, [groupsOpen]);

  const toggleGroup = (label: string) =>
    setGroupsOpen((st) => ({ ...st, [label]: !st[label] }));

  const isActive = (href: string) =>
    typeof path === "string" && path.startsWith(href);

  // Sidebar no longer drives global visibility on route changes; this avoids
  // fighting with the AppShell's visibility controller and keeps the
  // breadcrumbs toggle responsive on detail pages.

  return (
    <div
      className="h-screen border-r border-border bg-background flex flex-col transition-[width] duration-200 ease-in-out"
      style={{ width: open ? openWidth : railWidth }}
    >
      {/* Header/logo with hover-only toggle */}
      <div className="relative group flex items-center gap-2 px-3 py-2 h-14">
        <div className="flex-1 flex items-center gap-2">
          <Link 
            href="/dashboard"
            aria-label="Slabfy Home"
          >
            {open ? (
              <SmallLogo />
            ) : (
              <div className="transition-opacity group-hover:opacity-0">
                <Emblem />
              </div>
            )}
          </Link>
        </div>
        {open ? (
          <button
            onClick={() => setOpen(false)}
            aria-label="Collapse sidebar"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={() => setOpen(true)}
            aria-label="Expand sidebar"
            className="absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md p-1 transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto"
          >
            <ChevronRightIcon className="h-5 w-5" />
          </button>
        )}
      </div>
      {/* Nav items */}
      <ScrollArea className="flex-1">
        <TooltipProvider delayDuration={0}>
        <nav className="px-1 pt-1 pb-2">
          {topItems.map((item) => {
            const active = !isGroup(item) && isActive(item.href);
            if (!isGroup(item)) {
              const Icon = item.icon;
              // Special handling for "Create New" to show dropdown popover instead of navigating
              if (item.label === "Create New") {
                return (
                  <DropdownMenu key={item.label}>
                    {open ? (
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "w-full rounded-md px-2 py-3 text-sm transition-colors text-left flex",
                            "items-center gap-3",
                            "text-primary font-semibold hover:bg-muted",
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      </DropdownMenuTrigger>
                    ) : (
                      <Tooltip disableHoverableContent>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            <button
                              className={cn(
                                "w-full rounded-md px-2 py-3 text-sm transition-colors text-left flex",
                                "items-center justify-center",
                                "text-primary font-semibold hover:bg-muted",
                              )}
                            >
                              <Icon className="h-5 w-5 flex-shrink-0" />
                            </button>
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    )}
                    <DropdownMenuContent
                      align="start"
                      side="right"
                      className="min-w-[200px]"
                    >
                      <DropdownMenuItem onClick={() => setAssetOpen(true)}>
                        Asset
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setCollectionOpen(true)}>
                        Collection
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setConsignmentOpen(true)}
                      >
                        Consignment
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setLocation("/buying-desk")}
                      >
                        Buy Session
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEventOpen(true)}>
                        Show
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }
              return open ? (
                <Link 
                  key={item.label} 
                  href={item.href}
                  className={cn(
                    "flex rounded-md px-2 py-3 text-sm transition-colors",
                    "items-center gap-3",
                    active
                      ? "bg-primary/10 text-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <Tooltip key={item.label} disableHoverableContent>
                  <TooltipTrigger asChild>
                    <Link 
                      href={item.href}
                      className={cn(
                        "flex rounded-md px-2 py-3 text-sm transition-colors",
                        "items-center justify-center",
                        active
                          ? "bg-primary/10 text-foreground font-semibold"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }

            // Group
            const groupOpen = !!groupsOpen[item.label];
            const Toggle = groupOpen ? ChevronDown : ChevronRight;
            const GroupIcon = item.icon;
            const anyChildActive = item.children.some((c) => isActive(c.href));
            return (
              <div key={item.label} className="mb-1">
                {open ? (
                  <button
                  onClick={() => {
                    toggleGroup(item.label);
                  }}
                  className={cn(
                    "w-full rounded-md px-2 py-3 text-left text-sm flex items-center gap-3",
                    (groupOpen || anyChildActive)
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    groupOpen && "font-semibold",
                  )}
                  aria-expanded={groupOpen}
                >
                  <GroupIcon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 flex items-center justify-between">
                    <span>{item.label}</span>
                    <Toggle className="h-4 w-4 opacity-70" />
                  </div>
                </button>
                ) : (
                  <Tooltip disableHoverableContent>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          toggleGroup(item.label);
                        }}
                        className={cn(
                          "w-full rounded-md px-2 py-3 text-left text-sm flex items-center justify-center",
                          (groupOpen || anyChildActive)
                            ? "text-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          groupOpen && "font-semibold",
                        )}
                        aria-expanded={groupOpen}
                      >
                        <GroupIcon className="h-5 w-5 flex-shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )}
                {groupOpen && (
                  open ? (
                    <div className="mt-0.5 pl-2">
                      {item.children.map((leaf) => {
                        const LeafIcon = leaf.icon;
                        const leafActive = isActive(leaf.href);
                        return (
                          <Link 
                            key={leaf.label} 
                            href={leaf.href}
                            className={cn(
                              "ml-6 flex items-center gap-3 rounded-md px-2 py-3 text-sm",
                              leafActive
                                ? "bg-primary/10 text-foreground font-semibold"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )}
                          >
                            <LeafIcon className="h-4 w-4" />
                            <span>{leaf.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="mt-0.5 flex flex-col items-center gap-1">
                      {item.children.map((leaf) => {
                        const LeafIcon = leaf.icon;
                        const leafActive = isActive(leaf.href);
                        return (
                          <Tooltip key={leaf.label}>
                            <TooltipTrigger asChild>
                              <Link
                                href={leaf.href}
                                className={cn(
                                  "flex items-center justify-center h-10 w-10 rounded-md",
                                  leafActive
                                    ? "bg-primary/10 text-foreground"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                              >
                                <LeafIcon className="h-5 w-5" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">{leaf.label}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </nav>
        </TooltipProvider>
      </ScrollArea>

      <Separator />

      {/* Bottom: profile menu */}
      <div className="p-3">
        {/* Profile row acts as trigger for overflow menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full">
              <div className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={(user as any)?.avatarUrl ?? undefined}
                    alt={user?.email ?? "User"}
                  />
                  <AvatarFallback>
                    <UserIcon className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                {open && (
                  <div className="min-w-0 flex-1 text-left">
                    <div className="text-sm font-medium truncate">
                      {(user as any)?.displayName || user?.email || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      @{(user as any)?.username || "username"}
                    </div>
                  </div>
                )}
                <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun className="mr-2 h-4 w-4" />
              <span>Light</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon className="mr-2 h-4 w-4" />
              <span>Dark</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Laptop className="mr-2 h-4 w-4" />
              <span>Device</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLocation("/profile")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Profile Settings</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await signOut();
                } finally {
                  setLocation("/signin");
                }
              }}
            >
              Log Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Creation dialogs (render in portal, controlled by local state) */}
      <AddAssetModalSimple open={assetOpen} onOpenChange={setAssetOpen} />
      <AddCollectionDialog
        open={collectionOpen}
        onOpenChange={setCollectionOpen}
      />
      <AddConsignmentDialog
        isOpen={consignmentOpen}
        onClose={() => setConsignmentOpen(false)}
      />
      <AddEventDialog open={eventOpen} onOpenChange={setEventOpen} />
    </div>
  );
}

// no default export per slabfy rules