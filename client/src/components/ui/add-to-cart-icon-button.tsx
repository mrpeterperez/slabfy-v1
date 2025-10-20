import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type AddToCartIconButtonProps = Omit<ButtonProps, "children" | "variant" | "size"> & {
  "aria-label"?: string;
};

export function AddToCartIconButton({ className, ...props }: AddToCartIconButtonProps) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("h-10 w-10 rounded-full border border-brand text-brand hover:bg-brand-subtle", className)}
      aria-label={props["aria-label"] || "Add to cart"}
      {...props}
    >
      <Plus className="h-5 w-5" />
    </Button>
  );
}

export default AddToCartIconButton;
