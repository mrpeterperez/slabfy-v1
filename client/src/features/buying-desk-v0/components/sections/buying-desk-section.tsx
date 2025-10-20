// 🤖 INTERNAL NOTE:
// Purpose: Buying Desk section wrapper with toolbar controls
// Exports: BuyingDeskSection component
// Feature: buying-desk-v0

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon, Plus } from "lucide-react";
import { BuyingDeskTable } from "../table/main-table-v2";
import { AddAssetsDialog } from "../dialogs/add-assets-dialog";
import BuyingDeskColumnsPopover from "../table/columns-popover";
import { useColumnPreferences } from "../../hooks/use-column-preferences";
import type { ColumnConfig } from "../../types/table";

interface Props {
  sessionId: string;
  onOpenCart?: () => void;
}

export function BuyingDeskSection({ sessionId, onOpenCart }: Props) {
  const [addAssetsOpen, setAddAssetsOpen] = useState(false);
  const [search, setSearch] = useState("");
  
  const defaultColumns: ColumnConfig[] = [
    { key: 'asset', label: 'Asset', visible: true, locked: true },
    { key: 'list', label: 'Buy Price', visible: true },
    { key: 'market', label: 'Market Price', visible: true },
    { key: 'profit', label: 'Profit', visible: true },
    { key: 'confidence', label: 'Confidence', visible: true },
    { key: 'liquidity', label: 'Liquidity', visible: true },
    { key: 'seller', label: 'Seller', visible: false },
    { key: 'purchaseDate', label: 'Purchase Date', visible: false },
    { key: 'paymentMethod', label: 'Payment', visible: false },
    { key: 'status', label: 'Status', visible: true },
  ];

  const { columns, updatePreferences } = useColumnPreferences(sessionId, defaultColumns);

  const toggleColumn = (key: string) => {
    const newColumns = columns.map(c => 
      c.key === key && !c.locked ? { ...c, visible: !c.visible } : c
    );
    updatePreferences(newColumns);
  };

  const resetColumns = () => {
    updatePreferences(defaultColumns);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Section Title Toolbar with Controls */}
      <div className="hidden lg:block border-b border-border px-8 py-3 min-h-[60px]">
        <div className="flex items-center justify-between gap-4 w-full">
          <h2 className="font-heading text-lg font-semibold text-foreground">Buying Desk</h2>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search inventory…" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10" 
              />
            </div>
            <BuyingDeskColumnsPopover 
              columns={columns} 
              onToggle={toggleColumn} 
              onReset={resetColumns} 
              showReset={true} 
            />
            <Button onClick={() => setAddAssetsOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Assets
            </Button>
          </div>
        </div>
      </div>
      
      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        <BuyingDeskTable 
          sessionId={sessionId} 
          onOpenCart={onOpenCart}
          search={search}
          onSearchChange={setSearch}
        />
      </div>

      {/* Dialogs */}
      <AddAssetsDialog 
        open={addAssetsOpen} 
        onOpenChange={setAddAssetsOpen} 
        sessionId={sessionId} 
      />
    </div>
  );
}
