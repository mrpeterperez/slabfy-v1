// 🤖 INTERNAL NOTE:
// Purpose: Status cell component with dropdown for workflow changes
// Exports: StatusCell component
// Feature: buying-desk-v0
// Dependencies: ui components

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface StatusCellProps {
  itemId: string;
  status: 'evaluating' | 'ready' | 'purchased';
  isEditing: boolean;
  isPurchased: boolean;
  onStatusChange: (itemId: string, newStatus: string) => void;
}

export function StatusCell({
  itemId,
  status,
  isEditing,
  isPurchased,
  onStatusChange
}: StatusCellProps) {
  const getStatusDisplay = (status: string) => {
    return status.replace('_', ' ').replace(/^./, (s: string) => s.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    if (status === 'purchased') {
      return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    }
    return 'bg-muted text-foreground';
  };

  if (!isEditing || isPurchased) {
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
        {getStatusDisplay(status)}
      </span>
    );
  }

  return (
    <Select 
      value={status} 
      onValueChange={(newStatus: string) => onStatusChange(itemId, newStatus)}
    >
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="evaluating">Evaluating</SelectItem>
        <SelectItem value="ready">Buy List</SelectItem>
      </SelectContent>
    </Select>
  );
}