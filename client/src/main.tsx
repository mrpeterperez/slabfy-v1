import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ClickToComponent } from "click-to-react-component";

import App from "@/App";
import { AuthProvider } from "@/components/auth-provider";
import { ThemeProvider } from "@/components/theme";
import { queryClient } from "@/lib/queryClient";
import "./index.css";
// PWA service worker (use default import to support build variant)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - some typings expose default only
// PWA registration dynamically loaded
// 🔥 DISABLE PWA IN DEVELOPMENT - cache kills the vibe for local dev
const enablePWA = import.meta.env.PROD;

import { useEffect, useState } from "react";
function OfflineBanner() {
  const isBrowser = typeof navigator !== "undefined";
  const [online, setOnline] = useState(isBrowser ? navigator.onLine : true);
  useEffect(() => {
    if (!isBrowser) return;
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, [isBrowser]);
  if (online) return null;
  return (
    <div className="w-full bg-yellow-500 text-black text-xs md:text-sm py-1 text-center z-50">
      You are offline. Showing cached data.
    </div>
  );
}

// Ensure the real DOM root is viewport-locked and styled as requested
const rootEl = document.getElementById("root");
if (rootEl) {
  rootEl.className = "h-screen bg-background text-foreground overflow-hidden overscroll-y-none";
}

// Register Service Worker (PWA)
if (enablePWA) {
  import('virtual:pwa-register')
    .then((mod: any) => {
      const fn = mod.registerSW || mod.default;
      if (typeof fn === 'function') {
        try { fn({ immediate: true }); } catch { /* ignore */ }
      }
    })
    .catch(() => {/* ignore */});
} else if ('serviceWorker' in navigator) {
  // 🔥 AGGRESSIVELY NUKE service workers in dev to kill cache hell
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => {
      console.log('🗑️ Unregistering service worker:', reg.scope);
      reg.unregister();
    });
  });
  
  // Also clear all caches to be extra sure
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        console.log('🗑️ Deleting cache:', name);
        caches.delete(name);
      });
    });
  }
}

const isBuySession = (() => {
  try {
    const p = window.location.pathname;
    return /^\/(buying-desk)(\/|$)/.test(p);
  } catch {
    return false;
  }
})();

createRoot(rootEl!).render(
  <QueryClientProvider client={queryClient}>
    <ClickToComponent 
      editor="vscode"
      pathModifier={(path) => {
        console.log('🎯 Component:', path);
        return path;
      }}
    /> {/* 🔥 Option+Click to see file + open in VS Code! Check console for path info */}
    <ReactQueryDevtools initialIsOpen={false} />
    <OfflineBanner />
    <TooltipProvider>
      <ThemeProvider defaultTheme="system" storageKey="slabfy-ui-theme" {...{attribute: "class"}}>
        <AuthProvider>
          <App />
          <Toaster viewportClassName={isBuySession ? "top-0 right-0 sm:top-0 sm:right-0 sm:bottom-auto" : undefined} />
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
