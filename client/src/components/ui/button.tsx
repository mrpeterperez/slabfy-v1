import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap font-medium transition-all duration-150 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97] select-none backdrop-blur-sm [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:!m-0",
  {
    variants: {
      variant: {
        // Default - Bold primary with glassy effect + brand color glow
        default: "bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary hover:shadow-xl hover:shadow-primary/35 focus-visible:ring-primary",
        // Destructive - For dangerous actions with glassy effect + red glow
        destructive: "bg-destructive/90 text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive hover:shadow-xl hover:shadow-destructive/30 focus-visible:ring-destructive",
        // Outline - Clean glassy borders with subtle glow
        outline: "border-2 border-primary/40 text-primary hover:bg-primary/5 hover:border-primary/60 focus-visible:ring-primary backdrop-blur-md bg-background/50 shadow-sm shadow-primary/10",
        // Secondary - Subtle glassy look
        secondary: "bg-secondary/80 text-secondary-foreground hover:bg-secondary/90 focus-visible:ring-secondary/50 backdrop-blur-md shadow-sm shadow-secondary/10",
        // Ghost - Minimal glassy hover
        ghost: "hover:bg-accent/50 hover:text-accent-foreground focus-visible:ring-accent backdrop-blur-md",
        // Link - Clean link style (no glassy effect)
        link: "text-primary underline-offset-4 hover:underline backdrop-blur-none",
        // Success - For positive actions with glassy effect + green glow
        success: "bg-green-500/90 text-white shadow-lg shadow-green-500/20 hover:bg-green-500 hover:shadow-xl hover:shadow-green-500/30 focus-visible:ring-green-500",
        // Chip variants - Minimal glassy for tags/filters
        chipActive: "bg-secondary/10 text-secondary border backdrop-blur-md",
        chipInactive: "border bg-transparent text-muted-foreground hover:bg-secondary/5 backdrop-blur-md",
      },
      size: {
        // Include font-size per size for consistent typography control
        default: "h-10 lg:h-10 px-3 rounded-lg text-sm",
        sm: "h-12 lg:h-9 rounded-lg px-2.5 text-sm",
        lg: "h-14 lg:h-12 rounded-xl px-5 text-md",
        icon: "h-12 w-12 lg:h-10 lg:w-10 rounded-lg",
        chip: "h-7 px-2.5 rounded-lg text-xs",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        <span className="inline-flex items-center justify-center gap-1">
          {loading && (
            <svg
              className="animate-spin h-4 w-4"
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
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
