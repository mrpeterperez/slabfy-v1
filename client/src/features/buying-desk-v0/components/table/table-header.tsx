// 🤖 INTERNAL NOTE:
// Purpose: Sortable table header component for buying desk table
// Exports: SortableHeader, TableHeader components
// Feature: buying-desk-v0
// Dependencies: ui components, lucide-react

import { Checkbox } from "@/components/ui/checkbox";
import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil } from "lucide-react";
import type { SortColumn, SortDirection, ColumnVisibility } from "../../types/table";

interface SortableHeaderProps {
  column: SortColumn;
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  onToggleEdit?: () => void;
  isEditing?: boolean;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
}

export function SortableHeader({
  column,
  children,
  align = 'left',
  onToggleEdit,
  isEditing,
  sortColumn,
  sortDirection,
  onSort
}: SortableHeaderProps) {
  return (
    <th className={`px-3 py-3 ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'} text-sm font-medium text-muted-foreground whitespace-nowrap`}>
      <div className={`flex items-center gap-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : ''}`}>
        <button 
          className="inline-flex items-center gap-1 hover:text-foreground" 
          onClick={() => onSort(column)}
        >
          {children}
          {sortColumn === column ? (
            sortDirection === 'asc' ? 
              <ChevronUp className="h-3 w-3" /> : 
              <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground" />
          )}
        </button>
        {onToggleEdit && (
          <button 
            type="button" 
            className={`h-7 w-7 inline-flex items-center justify-center rounded hover:bg-muted/50 ${isEditing ? 'bg-muted/70 text-foreground' : ''}`} 
            onClick={(e) => { 
              e.stopPropagation(); 
              onToggleEdit(); 
            }} 
            aria-label="Toggle edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {isEditing && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-foreground/80">
            Editing
          </span>
        )}
      </div>
    </th>
  );
}

interface TableHeaderProps {
  visible: ColumnVisibility;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  editCols: Set<'list' | 'status'>;
  onToggleEditCol: (col: 'list' | 'status') => void;
  status: string;
  allSelected: boolean;
  headerIndeterminate: boolean;
  onToggleSelectAll: (checked: boolean) => void;
}

export function TableHeader({
  visible,
  sortColumn,
  sortDirection,
  onSort,
  editCols,
  onToggleEditCol,
  status,
  allSelected,
  headerIndeterminate,
  onToggleSelectAll
}: TableHeaderProps) {
  return (
    <thead className="bg-background border-b border-border">
      <tr>
        <th className="px-3 py-3 text-left font-medium text-foreground whitespace-nowrap">
          <Checkbox 
            checked={allSelected} 
            onCheckedChange={(v) => onToggleSelectAll(!!v)} 
            aria-label="Select all" 
            className="data-[state=indeterminate]:bg-primary/50" 
            style={{ ...(headerIndeterminate && { opacity: 0.7 }) }} 
            ref={(el) => { if (el) (el as any).indeterminate = headerIndeterminate; }} 
          />
        </th>
        
        <SortableHeader column="asset" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
          Asset
        </SortableHeader>
        
        {visible.list && (
          <SortableHeader 
            column="list" 
            align="right" 
            onToggleEdit={status === 'purchased' ? undefined : () => onToggleEditCol('list')} 
            isEditing={status !== 'purchased' && editCols.has('list')}
            sortColumn={sortColumn} 
            sortDirection={sortDirection} 
            onSort={onSort}
          >
            Buy Price
          </SortableHeader>
        )}
        
        {visible.market && (
          <SortableHeader column="market" align="right" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
            Market Price
          </SortableHeader>
        )}
        
        {visible.profit && (
          <SortableHeader column="profit" align="right" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
            Profit
          </SortableHeader>
        )}
        
        {visible.confidence && (
          <SortableHeader column="confidence" align="center" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
            Confidence
          </SortableHeader>
        )}
        
        {visible.liquidity && (
          <SortableHeader column="liquidity" align="center" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
            Liquidity
          </SortableHeader>
        )}
        
        {visible.seller && (
          <SortableHeader column="seller" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
            Seller
          </SortableHeader>
        )}
        
        {visible.purchaseDate && (
          <SortableHeader column="purchaseDate" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
            Purchase Date
          </SortableHeader>
        )}
        
        {visible.paymentMethod && (
          <SortableHeader column="paymentMethod" sortColumn={sortColumn} sortDirection={sortDirection} onSort={onSort}>
            Payment
          </SortableHeader>
        )}
        
        {visible.status && (
          <SortableHeader 
            column="status" 
            align="center" 
            onToggleEdit={status === 'purchased' ? undefined : () => onToggleEditCol('status')} 
            isEditing={status !== 'purchased' && editCols.has('status')}
            sortColumn={sortColumn} 
            sortDirection={sortDirection} 
            onSort={onSort}
          >
            Status
          </SortableHeader>
        )}
        
        <th className="sticky right-0 bg-background px-3 py-3 text-right text-sm font-medium text-muted-foreground whitespace-nowrap" />
      </tr>
    </thead>
  );
}