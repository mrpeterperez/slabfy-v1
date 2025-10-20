import * as React from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

interface BottomDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  allowSwipeDown?: boolean;
}

export function BottomDrawer({
  open,
  onOpenChange,
  title,
  children,
  footer,
  className,
  allowSwipeDown = true,
}: BottomDrawerProps) {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const startY = React.useRef<number | null>(null);
  const currentY = React.useRef<number>(0);
  const dragging = React.useRef<boolean>(false);

  const resetTransform = () => {
    const el = contentRef.current;
    if (!el) return;
    el.style.transition = "transform 150ms ease-out";
    el.style.transform = "translateY(0)";
    window.setTimeout(() => {
      if (el) el.style.transition = "";
    }, 160);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (!allowSwipeDown) return;
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    dragging.current = true;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (!allowSwipeDown || !dragging.current) return;
    if (startY.current == null) return;
    const dy = e.touches[0].clientY - startY.current;
    currentY.current = Math.max(0, dy);
    const el = contentRef.current;
    if (el) {
      el.style.transform = `translateY(${currentY.current}px)`;
    }
  };

  const onTouchEnd = () => {
    if (!allowSwipeDown || !dragging.current) return;
    dragging.current = false;
    const dy = currentY.current;
    // Close if pulled down far enough
    if (dy > 120) {
      onOpenChange(false);
    } else {
      resetTransform();
    }
    startY.current = null;
    currentY.current = 0;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "pb-safe-bottom p-0 rounded-t-3xl pt-3 sm:pt-4 overflow-hidden",
          className
        )}
      >
        <div
          ref={contentRef}
          className="relative p-4 pt-0"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Grab handle */}
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-muted-foreground/30" />
          {title ? (
            <div className="mb-6 px-1">
              <div className="font-heading text-2xl font-semibold">{title}</div>
            </div>
          ) : null}
          {children}
          {footer ? (
            <div className="mt-5 px-1 mb-4">{footer}</div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default BottomDrawer;
