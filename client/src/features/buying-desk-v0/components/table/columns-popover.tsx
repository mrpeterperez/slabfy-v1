// v0-local: Column visibility popover for buying desk table
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Layout } from "lucide-react";

export interface BuyingDeskColumnDef {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean;
}

interface Props {
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  columns: BuyingDeskColumnDef[];
  onToggle: (key: string) => void;
  onReset: () => void;
  showReset?: boolean;
}

export function BuyingDeskColumnsPopover({ open, onOpenChange, columns, onToggle, onReset, showReset }: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
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
      <PopoverContent className="w-56">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold">Show</div>
          {showReset && (
            <button className="text-xs text-primary underline" onClick={onReset}>Reset</button>
          )}
        </div>
        <div className="space-y-1">
          {columns.map((c) => (
            <label key={c.key} className={`flex items-center gap-2 cursor-pointer ${c.locked ? 'opacity-60 cursor-not-allowed' : ''}`}>
              <input type="checkbox" checked={c.visible} disabled={!!c.locked} onChange={() => onToggle(c.key)} className="accent-primary" />
              <span className="text-sm">{c.label}</span>
              {c.locked && (<span className="ml-auto text-xs text-muted-foreground">(Locked)</span>)}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default BuyingDeskColumnsPopover;