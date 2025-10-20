// 🤖 INTERNAL NOTE:
// ConsignmentAssetStatusTabs: Status tabs for filtering consignment assets by status
// Follows the inventory-v2-status-tabs.tsx pattern from events

export type ConsignmentAssetStatus = 'all' | 'active' | 'on_hold' | 'returned' | 'sold' | 'draft';

export interface ConsignmentAssetStatusCounts {
  all: number;
  active: number;
  on_hold: number;
  returned: number;
  sold: number;
  draft: number;
}

interface Props {
  value: ConsignmentAssetStatus;
  onChange: (v: ConsignmentAssetStatus) => void;
  counts: ConsignmentAssetStatusCounts;
}

import CountBadge from "@/components/ui/count-badge";

export default function ConsignmentAssetStatusTabs({ value, onChange, counts }: Props) {
  const tabs: Array<{ key: ConsignmentAssetStatus; label: string; count: number }> = [
    { key: 'active', label: 'Active', count: counts.active || 0 },
    { key: 'on_hold', label: 'On Hold', count: counts.on_hold || 0 },
    { key: 'returned', label: 'Returned', count: counts.returned || 0 },
    { key: 'sold', label: 'Sold', count: counts.sold || 0 },
    { key: 'draft', label: 'Draft', count: counts.draft || 0 },
    { key: 'all', label: 'All', count: counts.all || 0 },
  ];

  return (
    <nav className="flex overflow-x-auto scrollbar-hide">
      {tabs.map((t) => {
        const isActive = value === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={
              `whitespace-nowrap py-2 px-4 text-sm font-medium flex-shrink-0 transition-colors ` +
              (isActive
                ? "border-b-4 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground hover:border-border")
            }
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="inline-flex items-center gap-2">
              <span>{t.label}</span>
              <CountBadge value={t.count} />
            </span>
          </button>
        );
      })}
    </nav>
  );
}