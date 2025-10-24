import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { CalendarIcon, Check, X, Pencil } from "lucide-react";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";

interface InlineEditableCellProps {
  value: string | number | null;
  type: "price" | "date";
  onSave: (value: string | number | null) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Inline‑editable table cell that supports simple **price** editing and
 * calendar‑based **date** picking. – Drop‑in component.
 */
export const InlineEditableCell: React.FC<InlineEditableCellProps> = ({
  value,
  type,
  onSave,
  placeholder = "Click to edit",
  className = ""
}) => {
  /* ------------------------------------------------------------------ */
  // STATE & REFS
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState<string | number | null>(value);
  const [showCalendar, setShowCalendar] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  /* Autofocus when the price input becomes visible */
  useEffect(() => {
    if (isEditing && type === "price" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing, type]);

  /* ------------------------------------------------------------------ */
  // HELPERS
  const save = (val: string | number | null) => {
    console.log('💾 InlineEditableCell - Saving value:', val, 'Type:', type);
    onSave(val);
    setIsEditing(false);
    setShowCalendar(false);
  };

  const cancel = () => {
    setEditValue(value);
    setIsEditing(false);
    setShowCalendar(false);
  };

  /** Human‑friendly value shown in the non‑editing state */
  const pretty = () => {
    if (!value || value === "No date set" || value === null || value === undefined) return placeholder;

    if (type === "price") {
      return `$${Number(value).toFixed(2)}`;
    }

    if (type === "date") {
      // Extra safety check for string operations
      const dateString = String(value);
      const d = new Date(
        // add a neutral time so safari / tz quirks don't bite us
        dateString.includes("T") ? dateString : `${dateString}T12:00:00`
      );
      return isValid(d) ? format(d, "MMM dd, yyyy") : placeholder;
    }

    return String(value);
  };

  /* ------------------------------------------------------------------ */
  // DATE CELL (no inline input, calendar only)
  if (type === "date") {
    const hasDate = !!value && value !== "No date set";

    return (
      <Popover open={showCalendar} onOpenChange={setShowCalendar}>
        <PopoverTrigger asChild>
          {hasDate ? (
            <div
              className={cn(
                "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors",
                className
              )}
              onClick={() => setShowCalendar(true)}
            >
              {pretty()}
            </div>
          ) : (
            <span
              className="link-brand text-sm font-medium cursor-pointer"
              onClick={() => setShowCalendar(true)}
            >
              + Add Date
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[99999]" align="start">
          <Calendar
            mode="single"
            selected={hasDate && value ? new Date(`${String(value)}T12:00:00`) : undefined}
            onSelect={(date) => {
              if (!date) return;
              const iso = date.toISOString().split("T")[0];
              console.log('📅 InlineEditableCell - Date selected:', iso, 'Original value:', value);
              save(iso);
            }}
            disabled={(date) =>
              date > new Date() || date < new Date("1900-01-01")
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  /* ------------------------------------------------------------------ */
  // PRICE CELL
  if (!isEditing) {
    return (
      <div
        className={cn(
          "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors flex items-center gap-1 w-fit",
          !value && "text-muted-foreground italic",
          className
        )}
        onClick={() => setIsEditing(true)}
      >
        <span>{pretty()}</span>
        <Pencil className="h-3 w-3 opacity-60" aria-label="Edit price" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 w-52">
      <Input
        ref={inputRef}
        type="number"
        step="0.01"
        value={editValue ?? ""}
        onChange={(e) =>
          setEditValue(e.target.value ? parseFloat(e.target.value) : null)
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") save(editValue);
          if (e.key === "Escape") cancel();
        }}
        className="w-full"
        placeholder="0.00"
      />
      <Button size="sm" onClick={() => save(editValue)}>
        <Check className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="outline" onClick={cancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
