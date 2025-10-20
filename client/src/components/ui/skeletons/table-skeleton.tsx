// Purpose: Shared table skeleton rows matching Portfolio and Buying Desk style
import React from "react";

interface TableSkeletonProps {
  rows?: number;
  showAssetThumb?: boolean;
  columns?: Array<"list" | "market" | "profit" | "confidence" | "liquidity" | "status" | "actions">;
  includeSelectionCell?: boolean; // allow hiding the leading selection cell for non-asset tables
}

export function TableSkeleton({ rows = 5, showAssetThumb = true, columns = ["list","market","profit","confidence","liquidity","status","actions"], includeSelectionCell = true }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={`sk-${i}`} className="animate-pulse">
          {includeSelectionCell && (
            <td className="px-3 py-3"><div className="h-4 w-4 bg-skeleton rounded" /></td>
          )}
          <td className="px-3 py-3">
            <div className="flex items-start gap-3">
              {showAssetThumb && <div className="h-16 w-12 bg-skeleton rounded" />}
              <div className="space-y-2 mt-1">
                <div className="h-4 w-32 bg-skeleton rounded" />
                <div className="h-3 w-24 bg-skeleton rounded" />
                <div className="h-3 w-20 bg-skeleton rounded" />
              </div>
            </div>
          </td>
          {columns.includes("list") && (<td className="px-3 py-3 text-right"><div className="h-4 w-16 bg-skeleton rounded ml-auto" /></td>)}
          {columns.includes("market") && (
            <td className="px-3 py-3 text-right">
              <div className="h-4 w-20 bg-skeleton rounded ml-auto" />
              <div className="h-3 w-14 bg-skeleton rounded ml-auto mt-1" />
            </td>
          )}
          {columns.includes("profit") && (<td className="px-3 py-3 text-right"><div className="h-4 w-16 bg-skeleton rounded ml-auto" /></td>)}
          {columns.includes("confidence") && (<td className="px-3 py-3 text-center"><div className="h-3 w-24 bg-skeleton rounded mx-auto" /></td>)}
          {columns.includes("liquidity") && (<td className="px-3 py-3 text-center"><div className="h-3 w-20 bg-skeleton rounded mx-auto" /></td>)}
          {columns.includes("status") && (<td className="px-3 py-3 text-center"><div className="h-6 w-24 bg-skeleton rounded mx-auto" /></td>)}
          {columns.includes("actions") && (
            <td className="sticky right-0 bg-background px-3 py-3 text-right">
              <div className="flex gap-1 justify-end">
                <div className="h-8 w-8 bg-skeleton rounded" />
                <div className="h-8 w-8 bg-skeleton rounded" />
              </div>
            </td>
          )}
        </tr>
      ))}
    </>
  );
}

export function MobileListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={`m-sk-${i}`} className="py-3 flex items-start gap-3 animate-pulse">
          <div className="h-16 w-12 bg-skeleton rounded" />
          <div className="min-w-0 space-y-2">
            <div className="h-4 w-32 bg-skeleton rounded" />
            <div className="h-3 w-24 bg-skeleton rounded" />
            <div className="h-3 w-20 bg-skeleton rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

export default TableSkeleton;
