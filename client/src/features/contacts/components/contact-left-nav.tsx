// 🤖 INTERNAL NOTE:
// Purpose: Left navigation for contact detail page following same pattern as collection left nav
// Exports: ContactLeftNav component and ContactTab type
// Feature: contacts
// Dependencies: lucide-react, shared LeftNav

import { User, Calendar, Link } from "lucide-react";
import { LeftNav, type LeftNavItem } from "@/components/layout/left-nav";

export type ContactTab = 'overview' | 'activity' | 'references';

interface ContactLeftNavProps {
  activeTab: ContactTab;
  onTabChange: (tab: ContactTab) => void;
}

const navItems: Array<LeftNavItem> = [
  {
    id: 'overview',
    label: 'Overview',
    icon: User,
  },
  {
    id: 'activity',
    label: 'Activity',
    icon: Calendar,
  },
  {
    id: 'references',
    label: 'References',
    icon: Link,
  },
];

export function ContactLeftNav({ activeTab, onTabChange }: ContactLeftNavProps) {
  return (
    <div className="hidden lg:block bg-background border-r border-border flex-shrink-0 h-full" style={{ width: 256 }}>
      <LeftNav
        items={navItems}
        activeId={activeTab}
        onSelect={(id) => onTabChange(id as ContactTab)}
      />
    </div>
  );
}