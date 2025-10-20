// 🤖 INTERNAL NOTE:
// Purpose: Generic placeholder page used by unfinished routes
// Exports: ComingSoon (named export)
// Feature: layout/common
import * as React from "react";

export function ComingSoon() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Coming Soon</h1>
        <p className="text-muted-foreground">This section is not ready yet. Check back later.</p>
      </div>
    </div>
  );
}
