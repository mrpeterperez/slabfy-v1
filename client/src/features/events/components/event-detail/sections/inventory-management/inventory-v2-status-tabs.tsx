// 🤖 INTERNAL NOTE:
// InventoryV2StatusTabs: V2 tabs styled/placed exactly like V1 (underline tabs inside a nav)

export type V2Status = 'all' | 'available' | 'reserved' | 'sold' | 'removed' | 'inCart';

export interface StatusCounts {
  all: number;
  available: number;
  inCart: number;
  reserved: number; // includes pending
  sold: number;
  removed: number;
}

interface Props {
  value: V2Status;
  onChange: (v: V2Status) => void;
  counts: StatusCounts;
}

import CountBadge from "@/components/ui/count-badge";

export default function InventoryV2StatusTabs({ value, onChange, counts }: Props) {
  const tabs: Array<{ key: V2Status; label: string; count: number }> = [
    { key: 'available', label: 'Available', count: counts.available || 0 },
    { key: 'inCart', label: 'In Cart', count: counts.inCart || 0 },
    { key: 'sold', label: 'Sold', count: counts.sold || 0 },
    { key: 'reserved', label: 'Reserved', count: counts.reserved || 0 },
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
