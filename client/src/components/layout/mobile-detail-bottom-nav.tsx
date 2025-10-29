// Reusable bottom nav for detail pages (events, assets, consignments, etc.)

import type { LucideIcon } from "lucide-react";
import { MoreHorizontal } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export interface DetailNavTab {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  onClick: () => void;
}

export interface DetailNavMoreItem {
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface Props {
  tabs: DetailNavTab[];
  moreItems: DetailNavMoreItem[];
  activeTab: string;
}

export function MobileDetailBottomNav({ tabs, moreItems, activeTab }: Props) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="navigation"
      aria-label="Detail navigation"
    >
      <div className="mx-auto max-w-screen-md">
        <div className="grid grid-cols-5 items-center px-2 py-1 gap-1">
          {/* Main tabs */}
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={tab.onClick}
                className={`flex flex-col items-center justify-center py-2 text-xs transition-colors ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5" aria-hidden />
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 leading-none">{tab.label}</span>
              </button>
            );
          })}

          {/* More menu */}
          <div className="flex items-center justify-center">
            <Sheet>
              <SheetTrigger asChild>
                <button
                  className="flex flex-col items-center justify-center py-2 text-xs text-muted-foreground hover:text-foreground"
                  aria-label="More"
                >
                  <MoreHorizontal className="h-5 w-5" aria-hidden />
                  <span className="mt-0.5 leading-none">More</span>
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-auto">
                <SheetHeader>
                  <SheetTitle>More Options</SheetTitle>
                </SheetHeader>
                <div className="py-4 space-y-2">
                  {moreItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        onClick={item.onClick}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted rounded-lg transition-colors"
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-base font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
      {/* Safe area padding */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
