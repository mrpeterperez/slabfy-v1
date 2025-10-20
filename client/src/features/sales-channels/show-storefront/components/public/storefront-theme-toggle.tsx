// 🤖 INTERNAL NOTE:
// Purpose: Floating theme mode toggle for end users on public storefront
// Exports: StorefrontThemeToggle component
// Feature: sales-channels/show-storefront
// Dependencies: shadcn components, theme utilities

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark" | "system";

export function StorefrontThemeToggle() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    // Load from localStorage or default to system
    const saved = localStorage.getItem('storefront-user-theme-preference');
    return (saved as ThemeMode) || "system";
  });

  useEffect(() => {
    // Save preference to localStorage
    localStorage.setItem('storefront-user-theme-preference', themeMode);
    
    // Apply theme by toggling dark class on root element
    const root = document.documentElement;
    
    let shouldBeDark = false;
    if (themeMode === "dark") {
      shouldBeDark = true;
    } else if (themeMode === "system") {
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    
    // Toggle dark class for CSS variables
    if (shouldBeDark) {
      root.classList.add('dark');
      root.setAttribute('data-storefront-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-storefront-theme', 'light');
    }
    
    // Force page to re-evaluate theme
    window.dispatchEvent(new Event('storage'));
  }, [themeMode]);

  const getIcon = () => {
    switch (themeMode) {
      case "light": return <Sun className="h-4 w-4" />;
      case "dark": return <Moon className="h-4 w-4" />;
      case "system": return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-12 w-12 rounded-full shadow-lg bg-card/95 backdrop-blur-sm border-2 border-border hover:scale-105 hover:bg-card transition-transform"
          >
            {getIcon()}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem 
            onClick={() => setThemeMode("light")}
            className="cursor-pointer"
          >
            <Sun className="h-4 w-4 mr-2" />
            <span>Light</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setThemeMode("dark")}
            className="cursor-pointer"
          >
            <Moon className="h-4 w-4 mr-2" />
            <span>Dark</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setThemeMode("system")}
            className="cursor-pointer"
          >
            <Monitor className="h-4 w-4 mr-2" />
            <span>System</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
