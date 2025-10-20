// 🤖 INTERNAL NOTE:
// Purpose: Design-system Input component with variant + state styling (sizes, error, success, readOnly, icon adornments)
// Exports: Input
// Feature: shared ui
// Dependencies: class-variance-authority for variants, cn util for class merge

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  [
    "flex w-full rounded-lg border bg-background text-foreground font-normal",
    "placeholder:text-muted-foreground/60 placeholder:font-normal",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "transition-colors",
    "file:border-0 file:bg-transparent file:text-sm file:font-medium"
  ],
  {
    variants: {
      size: {
        // Align with Button's naming: default, sm, lg (keep md as alias for compatibility)
  default: "h-10 px-4 text-sm",
        sm: "h-9 px-3 text-sm",
        lg: "h-14 px-4 text-base",
        md: "h-12 px-4 text-sm",
        chip: "h-7 px-3 text-xs"
      },
      variant: {
        default: "border bg-input hover:shadow-sm hover:border-border/80",
        error: "border-destructive focus-visible:ring-destructive",
        success: "border-success focus-visible:ring-success"
      }
    },
    defaultVariants: {
      size: "default",
      variant: "default"
    }
  }
);

export interface InputProps 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
          VariantProps<typeof inputVariants> {
  /** Show error state */
  error?: boolean;
  /** Show success state */  
  success?: boolean;
  /** Icon to display at the start */
  startIcon?: React.ReactNode;
  /** Icon to display at the end */
  endIcon?: React.ReactNode;
  /** Label text */
  label?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Required field indicator */
  required?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    size, 
    variant, 
    error, 
    success, 
    startIcon, 
    endIcon, 
    label,
    helperText,
    required,
    disabled,
    id,
    ...props 
  }, ref) => {
    // Generate unique id if not provided
    const inputId = id || React.useId();
    const helperTextId = helperText ? `${inputId}-helper` : undefined;

    // Determine variant based on state
    const computedVariant = React.useMemo(() => {
      if (error) return "error";
      if (success) return "success";
      return variant;
    }, [error, success, variant]);

    const input = (
      <input
        ref={ref}
        id={inputId}
        disabled={disabled}
        required={required}
        aria-invalid={error}
        aria-describedby={helperTextId}
        className={cn(
          inputVariants({ size, variant: computedVariant }),
          startIcon && "pl-10",
          endIcon && "pr-10",
          className
        )}
        {...props}
      />
    );

    const inputWithIcons = !startIcon && !endIcon ? input : (
      <div className="relative">
        {startIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <span className="h-4 w-4 flex items-center justify-center">
              {startIcon}
            </span>
          </div>
        )}
        {input}
        {endIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground">
            <span className="h-4 w-4 flex items-center justify-center">
              {endIcon}
            </span>
          </div>
        )}
      </div>
    );

    // Return just input if no label or helper text
    if (!label && !helperText) {
      return inputWithIcons;
    }

    // Return complete form field
    return (
      <div className="space-y-2">
        {label && (
          <label 
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium leading-none text-foreground",
              disabled && "text-muted-foreground"
            )}
          >
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}
        {inputWithIcons}
        {helperText && (
          <p 
            id={helperTextId}
            className={cn(
              "text-sm",
              error ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";