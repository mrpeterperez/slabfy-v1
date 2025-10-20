// 🤖 INTERNAL NOTE:
// Columns visibility popover dedicated to my-portfolio-v0 (kept local & independent)
// Exports: PortfolioV0ColumnsPopover, V0ColumnDef

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Layout } from 'lucide-react';
import React from 'react';

export interface V0ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean; // non-toggleable (e.g. Trend)
}

interface Props {
  columns: V0ColumnDef[];
  onToggle: (key: string) => void;
  onReset: () => void;
}

export function PortfolioV0ColumnsPopover({ columns, onToggle, onReset }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Show/hide columns"
          onMouseDown={(e) => e.preventDefault()}
          onTouchStart={(e) => e.preventDefault()}
        >
          <Layout className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56" align="end">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Columns</div>
          <button className="text-xs text-primary underline" onClick={onReset}>Reset</button>
        </div>
        <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
          {columns.map(c => (
            <label
              key={c.key}
              className={`flex items-center gap-2 cursor-pointer ${c.locked ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <input
                type="checkbox"
                className="accent-primary"
                checked={c.visible}
                disabled={!!c.locked}
                onChange={() => !c.locked && onToggle(c.key)}
              />
              <span className="text-sm leading-none">{c.label}</span>
              {c.locked && <span className="ml-auto text-xs text-muted-foreground">(Locked)</span>}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default PortfolioV0ColumnsPopover;
