// 🤖 INTERNAL NOTE:
// Purpose: Compact toolbar for Inventory V2 with search, rows-per-page, Add Assets, and Cart button
// Exports: InventoryV2Toolbar component
// Feature: events

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, ShoppingCart, Search as SearchIcon } from "lucide-react";
import InventoryV2ColumnsPopover from "./inventory-v2-columns-popover";

interface Props {
  count: number;
  search: string;
  onSearch: (v: string) => void;
  onAddAssets: () => void;
  onToggleCart?: () => void;
  cartCount?: number;
  // columns popover props (optional, keep minimal)
  columns?: { key: string; label: string; visible: boolean; locked?: boolean }[];
  onToggleColumn?: (key: string) => void;
  onResetColumns?: () => void;
}

export function InventoryV2Toolbar({ count, search, onSearch, onAddAssets, onToggleCart, cartCount, columns = [], onToggleColumn, onResetColumns }: Props) {
  return (
    <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px] flex items-center">
      <div className="flex items-center justify-between gap-4 w-full">
  <h2 className="font-heading text-lg font-semibold text-foreground">Inventory</h2>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search inventory…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {!!columns.length && onToggleColumn && (
            <InventoryV2ColumnsPopover
              columns={columns}
              onToggle={onToggleColumn}
              onReset={onResetColumns || (() => {})}
              showReset={!!onResetColumns}
            />
          )}
          <Button onClick={onAddAssets}>
            Add Assets
          </Button>
          {/* Cart button removed per request */}
        </div>
      </div>
    </div>
  );
}

export default InventoryV2Toolbar;
