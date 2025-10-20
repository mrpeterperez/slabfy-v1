// 🤖 INTERNAL NOTE:
// Purpose: Theme mode toggle for Light/Dark/Auto
// Exports: ThemeModeToggle component
// Feature: sales-channels/show-storefront
// Dependencies: shadcn button, lucide icons

import { Sun, Moon, Monitor } from "lucide-react";

export type ThemeMode = "light" | "dark" | "auto";

interface ThemeModeToggleProps {
  mode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
}

export function ThemeModeToggle({ mode, onModeChange }: ThemeModeToggleProps) {
  const modes: { value: ThemeMode; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "auto", icon: Monitor, label: "Device" },
  ];

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      {modes.map(({ value, icon: Icon, label }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            onClick={() => onModeChange(value)}
            className={`p-2 rounded transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
            aria-label={label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}
