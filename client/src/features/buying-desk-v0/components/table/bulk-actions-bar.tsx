// 🤖 INTERNAL NOTE:
// Purpose: Bulk selection actions bar for buying desk table
// Exports: BulkActionsBar component
// Feature: buying-desk-v0
// Dependencies: UI components

import { Button } from "@/components/ui/button";

interface BulkActionsBarProps {
  selected: Set<string>;
  onBulkMove: (targetStatus: 'evaluating' | 'buyList') => void;
}

export function BulkActionsBar({ selected, onBulkMove }: BulkActionsBarProps) {
  if (selected.size === 0) return null;

  return (
    <div className="px-6 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
      <span className="text-sm font-medium">{selected.size} selected</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onBulkMove('evaluating')}>
          Move to Evaluating
        </Button>
        <Button size="sm" variant="outline" onClick={() => onBulkMove('buyList')}>
          Move to Buy List
        </Button>
      </div>
    </div>
  );
}