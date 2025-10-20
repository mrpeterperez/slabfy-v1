// 🤖 INTERNAL NOTE:
// Purpose: Desktop app shell that renders the global left sidebar and the page content
// Exports: AppShell component (named export only)
// Feature: layout
// Dependencies: @/components/layout/app-sidebar, wouter
import * as React from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { AppSidebar } from "./app-sidebar";
import { GlobalBreadcrumbs } from "./breadcrumbs-header";

// Desktop app shell that conditionally shows the left sidebar on main pages.
// Mobile variant will be handled later; for now sidebar is hidden on <md.

export function AppShell({ children }: { children: React.ReactNode }) {
  const [path] = useLocation();
  const { user, loading } = useAuth();
  const [sidebarVisible, setSidebarVisible] = React.useState(true);

  // Show the sidebar ONLY when user is authenticated AND on app routes (not auth/onboarding/public).
  const showSidebar = React.useMemo(() => {
    if (typeof path !== "string") return false;
    
    // Never show sidebar on auth/onboarding/public storefront routes
    const hidePrefixes = [
      "/signin",
      "/signup",
      "/reset-password",
      "/email-confirmed",
      "/oauth-callback",
      "/onboarding/",
      "/storefront/", // Public storefront - always full-screen
    ];
    if (hidePrefixes.some((p) => path.startsWith(p))) return false;
    
    // Never show sidebar if user is not authenticated (critical security fix)
    if (!user && !loading) return false;
    
    return true;
  }, [path, user, loading]);

    // Event listener for sidebar visibility control
  React.useEffect(() => {
    const handleToggleVisibility = () => {
      setSidebarVisible(prev => {
        const newState = !prev;
        if (newState) {
          // When showing, also dispatch open event
          try {
            window.dispatchEvent(new CustomEvent("slabfy:sidebar-open"));
          } catch {
            window.dispatchEvent(new Event("slabfy:sidebar-open"));
          }
        }
        return newState;
      });
    };

    const handleHide = () => setSidebarVisible(false);
    const handleShowExpanded = () => {
      setSidebarVisible(true);
      try {
        window.dispatchEvent(new CustomEvent("slabfy:sidebar-open"));
      } catch {
        window.dispatchEvent(new Event("slabfy:sidebar-open"));
      }
    };

    window.addEventListener("slabfy:sidebar-toggle-visibility", handleToggleVisibility);
    window.addEventListener("slabfy:sidebar-hide", handleHide);
    window.addEventListener("slabfy:sidebar-show-expanded", handleShowExpanded);

    return () => {
      window.removeEventListener("slabfy:sidebar-toggle-visibility", handleToggleVisibility);
      window.removeEventListener("slabfy:sidebar-hide", handleHide);
      window.removeEventListener("slabfy:sidebar-show-expanded", handleShowExpanded);
    };
  }, []);

  // Route-based visibility: keep user's choice on child/detail routes.
  // Optionally ensure sidebar is shown on hub routes for discoverability.
  React.useEffect(() => {
    if (typeof path !== "string") return;
    const isHub = /^\/(my-portfolio|consignments|collections|events|buying-desk)(\/?$)/.test(path);
    if (isHub) {
      setSidebarVisible(true);
      try {
        window.dispatchEvent(new CustomEvent("slabfy:sidebar-open"));
      } catch {
        window.dispatchEvent(new Event("slabfy:sidebar-open"));
      }
    }
  }, [path]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full">
        {showSidebar && sidebarVisible ? (
          <aside className="hidden md:block">
            <AppSidebar />
          </aside>
        ) : null}
        <main className="flex-1 min-w-0 h-screen overflow-hidden flex flex-col">
            {/* Global breadcrumbs header (hidden on auth/onboarding) */}
            <GlobalBreadcrumbs />
            <div className="flex-1 overflow-auto">
              {children}
            </div>
          </main>
      </div>
    </div>
  );
}

