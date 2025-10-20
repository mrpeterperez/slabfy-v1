// 🤖 INTERNAL NOTE:
// Reusable subtle pill for asset type (graded/raw/autograph/sealed/other)
// Exports: AssetTypeBadge, getAssetTypeLabel

import React from 'react';

export type AssetType = string | null | undefined;

const LABEL_MAP: Record<string, string> = {
  graded: 'Graded',
  raw: 'Raw',
  autograph: 'Autograph',
  sealed: 'Sealed',
  other: 'Other',
};

export function getAssetTypeLabel(t: AssetType): string {
  if (!t) return '—';
  const k = String(t).toLowerCase();
  return LABEL_MAP[k] || k.charAt(0).toUpperCase() + k.slice(1);
}

interface Props {
  type: AssetType;
  className?: string;
}

export const AssetTypeBadge: React.FC<Props> = ({ type, className }) => {
  const label = getAssetTypeLabel(type);
  if (label === '—') {
    return <span className={`inline-block px-2 py-0.5 rounded-full border border-border bg-background text-[10px] font-medium text-muted-foreground ${className || ''}`}>—</span>;
  }
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full border border-border bg-background text-[10px] font-medium text-foreground whitespace-nowrap ${className || ''}`}
    >
      {label}
    </span>
  );
};

export default AssetTypeBadge;
