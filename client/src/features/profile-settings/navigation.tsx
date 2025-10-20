/*
 * This file contains the navigation component for profile settings.
 * Exports: NavigationItem, ProfileSettingsNavigation components
 * Feature: profile-settings
 */

import { cn } from "@/lib/utils";
import { User, CircleUser, Beaker, AtSign } from "lucide-react";
import { Link } from "wouter";

type NavigationSectionProps = {
  activeSection: string;
  onSectionChange: (section: string) => void;
};

type NavigationItemProps = {
  id: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
};

export function NavigationItem({ id, label, icon, active, onClick }: NavigationItemProps) {
  return (
    <button
      className={cn(
        "flex items-center gap-2 w-full rounded-md px-3 py-2 text-sm transition-colors",
        active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

export function ProfileSettingsNavigation({ activeSection, onSectionChange }: NavigationSectionProps) {
  const navigationItems = [
    {
      id: "profile",
      label: "Profile",
      icon: <CircleUser className="h-5 w-5" />,
    },
    {
      id: "username",
      label: "Username",
      icon: <AtSign className="h-5 w-5" />,
    },
    {
      id: "personalization",
      label: "Personalization",
      icon: <Beaker className="h-5 w-5" />,
    },
    {
      id: "account",
      label: "Account",
      icon: <User className="h-5 w-5" />,
    },
  ];

  return (
    <div className="w-64 mr-6">
      <div className="mb-2 px-4">
        <h3 className="text-lg font-semibold tracking-tight">Account</h3>
      </div>
      <nav className="space-y-1">
        {navigationItems.map((item) => (
          <NavigationItem
            key={item.id}
            id={item.id}
            label={item.label}
            icon={item.icon}
            active={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
          />
        ))}
      </nav>
    </div>
  );
}
