// 🤖 INTERNAL NOTE:
// Purpose: Mobile bottom drawer for portfolio filters
// Exports: MobileFiltersDrawer component
// Feature: my-portfolio-v0
// Dependencies: react, lucide-react, @/components/ui, ./filter-provider-v0

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { useFiltersV0 } from './filter-provider-v0';
import { Asset } from '@shared/schema';

interface MobileFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
}

export function MobileFiltersDrawer({ isOpen, onClose, assets }: MobileFiltersDrawerProps) {
  const {
    typeFilter,
    ownershipFilter,
    gradeFilter,
    setTypeFilter,
    setOwnershipFilter,
    setGradeFilter,
    clearFilters,
    activeCount
  } = useFiltersV0();

  // Extract unique grades from assets
  const gradeOptions = useMemo(() => {
    const grades = new Set<string>();
    assets.forEach(asset => {
      if (asset.grade && asset.grader) {
        const gradeLabel = `${asset.grader} ${asset.grade}`;
        grades.add(gradeLabel);
      }
    });
    return Array.from(grades).sort();
  }, [assets]);

  // Collapsible states
  const [openSections, setOpenSections] = useState<{[k:string]: boolean}>({
    cardType: true,
    ownership: true,
    grade: true,
  });

  const toggle = (key: string) => setOpenSections((s: Record<string, boolean>) => ({ ...s, [key]: !s[key] }));

  const chipVariant = (active: boolean) => (active ? 'default' : 'outline');

  const renderHeader = (label: string, key: string) => (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-between h-auto px-0 py-0 hover:bg-transparent"
      onClick={() => toggle(key)}
    >
      <span className="text-sm font-medium hover:text-primary transition-colors">{label}</span>
      {openSections[key]
        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
    </Button>
  );

  const typeOptions = ['graded', 'raw', 'autograph'];
  const ownershipOptions = ['own', 'consignment'];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="lg:hidden fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-[9999] bg-background rounded-t-2xl shadow-xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle bar */}
        <div className="flex-shrink-0 flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Filters</h2>
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeCount}
                </Badge>
              )}
            </div>
            <button
              onClick={onClose}
              className="min-w-[48px] min-h-[48px] flex items-center justify-center -mr-3"
              aria-label="Close filters"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          {/* Card Type */}
          <div className="space-y-3">
            {renderHeader('Card Type', 'cardType')}
            {openSections.cardType && (
              <div className="flex flex-wrap gap-2">
                {typeOptions.map(opt => (
                  <Badge
                    key={opt}
                    variant={chipVariant(typeFilter.includes(opt))}
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      const next = typeFilter.includes(opt)
                        ? typeFilter.filter(t => t !== opt)
                        : [...typeFilter, opt];
                      setTypeFilter(next);
                    }}
                  >
                    {opt}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Ownership */}
          <div className="space-y-3">
            {renderHeader('Ownership', 'ownership')}
            {openSections.ownership && (
              <div className="flex flex-wrap gap-2">
                {ownershipOptions.map(opt => (
                  <Badge
                    key={opt}
                    variant={chipVariant(ownershipFilter.includes(opt))}
                    className="cursor-pointer capitalize"
                    onClick={() => {
                      const next = ownershipFilter.includes(opt)
                        ? ownershipFilter.filter(o => o !== opt)
                        : [...ownershipFilter, opt];
                      setOwnershipFilter(next);
                    }}
                  >
                    {opt}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Grade */}
          {gradeOptions.length > 0 && (
            <div className="space-y-3">
              {renderHeader('Grade', 'grade')}
              {openSections.grade && (
                <div className="flex flex-wrap gap-2">
                  {gradeOptions.map(opt => (
                    <Badge
                      key={opt}
                      variant={chipVariant(gradeFilter.includes(opt))}
                      className="cursor-pointer"
                      onClick={() => {
                        const next = gradeFilter.includes(opt)
                          ? gradeFilter.filter(g => g !== opt)
                          : [...gradeFilter, opt];
                        setGradeFilter(next);
                      }}
                    >
                      {opt}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 px-5 py-4 border-t bg-background">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={clearFilters}
              disabled={activeCount === 0}
            >
              Clear All
            </Button>
            <Button
              className="flex-1"
              onClick={onClose}
            >
              Apply Filters
            </Button>
          </div>
        </div>

        {/* Safe area padding */}
        <div className="pb-[env(safe-area-inset-bottom)]" aria-hidden="true" />
      </div>
    </>
  );
}
