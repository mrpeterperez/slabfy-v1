// 🤖 INTERNAL NOTE:
// Purpose: Modern Radix-inspired button component with smooth animations
// Exports: RadixButton component
// Feature: ui-components
// Dependencies: class-variance-authority, @/lib/utils

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const radixButtonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap font-medium transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none backdrop-blur-sm border border-white/20",
  {
    variants: {
      variant: {
        // Solid - Bold and confident with glassy effect + translucent border
        solid: "bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary hover:shadow-xl hover:shadow-primary/35 focus-visible:ring-primary border-white/25 hover:border-white/35",
        // Soft - Subtle glassy look with gradient border
        soft: "bg-primary/5 text-primary hover:bg-primary/10 focus-visible:ring-primary/50 backdrop-blur-md border-primary/20 hover:border-primary/30 shadow-sm shadow-primary/10",
        // Outline - Clean glassy borders with gradient
        outline: "border-2 border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 focus-visible:ring-primary backdrop-blur-md bg-background/50 shadow-sm shadow-primary/10",
        // Ghost - Minimal glassy hover with subtle border
        ghost: "text-foreground hover:bg-accent/50 hover:text-accent-foreground focus-visible:ring-accent backdrop-blur-md border-transparent hover:border-white/10",
        // Surface - Card-like glassy with prominent border
        surface: "bg-card/80 text-card-foreground shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/15 border-white/10 hover:border-white/20 focus-visible:ring-primary backdrop-blur-md",
        // Destructive - For dangerous actions with glassy effect + red border
        destructive: "bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive hover:shadow-xl hover:shadow-destructive/30 focus-visible:ring-destructive border-red-400/25 hover:border-red-400/35",
        // Success - For positive actions with glassy effect + green border
        success: "bg-green-500/90 text-white shadow-lg shadow-green-500/20 hover:bg-green-500 hover:shadow-xl hover:shadow-green-500/30 focus-visible:ring-green-500 border-green-300/25 hover:border-green-300/35",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-lg",
        sm: "h-8 px-3 text-xs rounded-lg",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base rounded-2xl",
        xl: "h-14 px-8 text-lg rounded-2xl",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      radius: {
        none: "rounded-none",
        sm: "rounded-lg",
        md: "rounded-xl",
        lg: "rounded-2xl",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "solid",
      size: "md",
      radius: "sm",
    },
  }
);

export interface RadixButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof radixButtonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const RadixButton = React.forwardRef<HTMLButtonElement, RadixButtonProps>(
  ({ className, variant, size, radius, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(radixButtonVariants({ variant, size, radius, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        <span className="inline-flex items-center justify-center gap-1">
          {loading && (
            <svg
              className="animate-spin h-4 w-4 mr-2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          )}
          {children}
        </span>
      </button>
    );
  }
);

RadixButton.displayName = "RadixButton";

export { RadixButton, radixButtonVariants };
