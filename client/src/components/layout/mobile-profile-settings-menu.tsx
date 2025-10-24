// Mobile Profile Settings Menu
// Full-screen modal with navigation to Profile Details, Username, Personalization, Account
// Includes appearance toggle and log out

import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, User, AtSign, Palette, Shield, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileProfileSettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string) => void;
}

const menuItems = [
  { id: "profile", label: "Profile Details", icon: User },
  { id: "username", label: "Username", icon: AtSign },
  { id: "personalization", label: "Personalization", icon: Palette },
  { id: "account", label: "Account", icon: Shield },
];

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "Device", icon: Monitor },
];

export function MobileProfileSettingsMenu({ isOpen, onClose, onNavigate }: MobileProfileSettingsMenuProps) {
  const { signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await signOut();
    setLocation("/signin");
  };

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[60] bg-background">
      {/* Header */}
      <div className="bg-background px-5">
        <div className="flex h-16 items-center">
          <button
            onClick={onClose}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
            aria-label="Close"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-3 pb-8">
        <h1 className="text-[34px] font-heading font-semibold mb-8">
          Profile Settings
        </h1>

        {/* Menu Items */}
        <div className="space-y-1 -mx-5 px-5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="w-full flex items-center justify-between py-4 text-left hover:bg-muted/50 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="text-base">{item.label}</span>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </button>
            );
          })}
        </div>

        {/* Appearance Toggle */}
        <div className="mt-8 pt-8 border-t">
          <h2 className="text-sm font-medium text-muted-foreground mb-4">Appearance</h2>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isActive = theme === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors",
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )} />
                  <span className={cn(
                    "text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Log Out */}
        <div className="mt-8 pt-8">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Log out
          </Button>
        </div>
      </div>
    </div>
  );
}
