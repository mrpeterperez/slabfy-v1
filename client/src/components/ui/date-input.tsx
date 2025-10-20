import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const dateInputVariants = cva(
  [
    "flex w-full items-center rounded-lg border bg-background text-foreground font-normal",
    "placeholder:text-muted-foreground/60 placeholder:font-normal",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:border-primary",
  // Keep focus ring visible when popover is open (Radix sets data-state="open" on Trigger)
  "data-[state=open]:ring-2 data-[state=open]:ring-primary data-[state=open]:ring-offset-2 data-[state=open]:border-primary",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "transition-colors",
  ],
  {
    variants: {
      size: {
        default: "h-10 px-4 text-sm",
        sm: "h-9 px-3 text-sm",
        md: "h-12 px-4 text-sm",
        lg: "h-14 px-4 text-base",
        chip: "h-7 px-3 text-xs",
      },
      variant: {
        default: "border bg-input hover:shadow-sm hover:border-border/80",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-success focus-visible:ring-success",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
);

export interface DateInputProps
  extends Omit<React.HTMLAttributes<HTMLButtonElement>, "onChange">,
    VariantProps<typeof dateInputVariants> {
  value?: string | Date;
  onChange?: (value?: string) => void; // YYYY-MM-DD or undefined
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export const DateInput = React.forwardRef<HTMLButtonElement, DateInputProps>(
  (
    {
      className,
      size,
      variant,
      value,
      onChange,
      placeholder = "Pick a date",
      disabled,
      id,
      name,
      required,
      minDate = new Date("1900-01-01"),
      maxDate = new Date(),
      ...props
    },
    ref
  ) => {
    const parsedDate: Date | undefined = React.useMemo(() => {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      const s = String(value);
      return new Date(s.includes("T") ? s : `${s}T12:00:00`);
    }, [value]);

    const display = parsedDate ? format(parsedDate, "MMM dd, yyyy") : placeholder;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            name={name}
            aria-required={required}
            aria-haspopup="dialog"
            aria-label={placeholder}
            ref={ref}
            disabled={disabled}
            className={cn(
              dateInputVariants({ size, variant }),
              "text-left",
              !parsedDate && "text-muted-foreground",
              className
            )}
            {...props}
          >
            <span className="truncate">
              {display}
            </span>
            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>
  <PopoverContent className="w-auto p-0 z-[200]" align="start">
          <Calendar
            mode="single"
            selected={parsedDate}
            onSelect={(date) => {
              if (onChange) {
                if (!date) return onChange(undefined);
                onChange(date.toISOString().split("T")[0]);
              }
            }}
            disabled={(d) => d > maxDate || d < minDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }
);

DateInput.displayName = "DateInput";

export { dateInputVariants };
