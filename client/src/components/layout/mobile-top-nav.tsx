import * as React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Info } from "lucide-react";

export interface MobileTopNavProps {
  title: string;
  onBack?: () => void;
  onInfo?: () => void;
  right?: React.ReactNode;
  className?: string;
}

/**
 * Sticky/fixed mobile-only top navigation bar with back arrow, centered title (+ optional info), and an optional right slot.
 * - Hidden on md and up
 * - Fixed to the top with backdrop blur
 * - Includes a spacer to prevent content from being overlapped
 */
export function MobileTopNav({ title, onBack, onInfo, right, className }: MobileTopNavProps) {
  const handleBack = React.useCallback(() => {
    if (onBack) return onBack();
    try {
      if (window.history.length > 1) window.history.back();
      else window.location.assign("/events");
    } catch {
      /* no-op */
    }
  }, [onBack]);

  return (
    <>
      <div
        className={
          "md:hidden fixed top-0 inset-x-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 " +
          (className ?? "")
        }
        role="navigation"
        aria-label="Mobile top"
      >
        <div className="mx-auto max-w-screen-sm">
          <div className="flex h-16 items-center justify-between px-1">
            {/* Back (shown only when onBack provided) */}
            {onBack ? (
              <Button
                variant="ghost"
                className="h-12 w-12 min-h-[3rem] min-w-[3rem] p-0"
                onClick={handleBack}
                aria-label="Back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <div className="h-12 w-12 min-h-[3rem] min-w-[3rem]" aria-hidden />
            )}

            {/* Title + optional info */}
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-base font-semibold truncate max-w-[55vw]" title={title}>
                {title}
              </span>
              {onInfo && (
                <Button
                  variant="ghost"
                  className="h-12 w-12 min-h-[3rem] min-w-[3rem] text-muted-foreground/80 hover:text-foreground"
                  onClick={onInfo}
                  aria-label="Info"
                >
                  <Info className="h-6 w-6" />
                </Button>
              )}
            </div>

            {/* Right slot (e.g., overflow menu) */}
            <div className="h-12 w-12 min-h-[3rem] min-w-[3rem] flex items-center justify-center">
              {right ?? null}
            </div>
          </div>
        </div>
        {/* Safe area padding for iOS notch */}
        <div className="pt-[env(safe-area-inset-top)]" aria-hidden />
      </div>
      {/* Spacer so content isn't hidden behind the fixed bar */}
      <div className="md:hidden h-16" aria-hidden />
    </>
  );
}

export default MobileTopNav;
