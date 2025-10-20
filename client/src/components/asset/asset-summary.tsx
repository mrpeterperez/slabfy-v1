// 🤖 INTERNAL NOTE:
// Purpose: Shared presentational summary for a card/asset (matches portfolio styling)
// Exports: AssetSummary component
// Feature areas: portfolio, consignments, events

import React from 'react';
import { cn } from '@/lib/utils';

type Size = 'sm' | 'md';

interface AssetSummaryProps {
  year?: string | number | null;
  setName?: string | null;
  playerName?: string | null;
  cardNumber?: string | number | null;
  grade?: string | null; // e.g. "NM-MT 8"
  gradeCompany?: string | null; // e.g. "PSA"
  certNumber?: string | number | null;
  size?: Size;
  className?: string;
  headingFont?: string; // For player name
  bodyFont?: string; // For year, set, grade, cert
  textColor?: string; // Custom text color (overrides Tailwind classes)
  mutedTextColor?: string; // Custom muted text color (overrides Tailwind classes)
}

export function AssetSummary({
  year,
  setName,
  playerName,
  cardNumber,
  grade,
  gradeCompany = 'PSA',
  certNumber,
  size = 'md',
  className,
  headingFont = 'Inter',
  bodyFont = 'Inter',
  textColor,
  mutedTextColor,
}: AssetSummaryProps) {
  const isSm = size === 'sm';
  const yearSet = [year, setName].filter(Boolean).join(' ').toUpperCase();
  const player = (playerName ?? '').toString().toUpperCase();
  const card = cardNumber ? `#${cardNumber}` : '';
  const gradeStr = grade ? `${(gradeCompany ?? '').toString().toUpperCase()} ${grade.toString().toUpperCase()}` : '';
  const cardAndGrade = [card, gradeStr].filter(Boolean).join(' • ');

  return (
    <div className={cn('flex flex-col min-w-0', className)}>
      {/* Line 1: YEAR SET - Body Font */}
      <div 
        className={cn('uppercase tracking-wide',
          !mutedTextColor && 'text-muted-foreground',
          isSm ? 'text-[10px] leading-3 line-clamp-1' : 'text-xs leading-4 line-clamp-1'
        )}
        style={{ 
          fontFamily: bodyFont,
          ...(mutedTextColor && { color: mutedTextColor })
        }}
      >
        {yearSet}
      </div>
      {/* Line 2: PLAYER NAME - Heading Font */}
      <div 
        className={cn('font-semibold uppercase',
          !textColor && 'text-foreground',
          isSm ? 'text-xs leading-4 line-clamp-2' : 'text-sm leading-5 line-clamp-2'
        )}
        style={{ 
          fontFamily: headingFont,
          ...(textColor && { color: textColor })
        }}
      >
        {player}
      </div>
      {/* Line 3: #CARD • GRADE - Body Font */}
      <div 
        className={cn('uppercase',
          !textColor && 'text-foreground',
          isSm ? 'text-[11px] leading-4 line-clamp-1' : 'text-sm leading-5 line-clamp-1'
        )}
        style={{ 
          fontFamily: bodyFont,
          ...(textColor && { color: textColor })
        }}
      >
        {cardAndGrade}
      </div>
      {/* Line 4: CERT - Body Font */}
      {certNumber ? (
        <div 
          className={cn(
            !mutedTextColor && 'text-muted-foreground',
            isSm ? 'text-[10px] leading-3 line-clamp-1' : 'text-xs leading-4 line-clamp-1'
          )}
          style={{ 
            fontFamily: bodyFont,
            ...(mutedTextColor && { color: mutedTextColor })
          }}
        >
          Cert# {certNumber}
        </div>
      ) : null}
    </div>
  );
}
