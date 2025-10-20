// 🤖 INTERNAL NOTE:
// Purpose: Centralized left navigation for Collections (mobile header + desktop sidebar)
// Exports: CollectionLeftNav component
// Feature: collections
// Dependencies: shadcn/ui Tabs, Button, ThemeToggle, lucide-react icons

import { Package, Settings } from 'lucide-react';
import type { SVGProps, ComponentType } from 'react';
import { LeftNav, type LeftNavItem } from '@/components/layout/left-nav';

export type CollectionTab = 'assets' | 'settings';

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

const navigationItems: Array<{
  id: CollectionTab;
  label: string;
  icon: IconType;
}> = [
  { id: 'assets', label: 'Assets', icon: Package },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface CollectionLeftNavProps {
  activeTab: CollectionTab;
  onTabChange: (tab: CollectionTab) => void;
}

export function CollectionLeftNav({ activeTab, onTabChange }: CollectionLeftNavProps) {
  return (
    <div className="hidden lg:block bg-background border-r border-border flex-shrink-0 h-full" style={{ width: 256 }}>
      <LeftNav
        items={navigationItems as unknown as LeftNavItem[]}
        activeId={activeTab}
        onSelect={(id) => onTabChange(id as CollectionTab)}
      />
    </div>
  );
}
