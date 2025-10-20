// 🤖 INTERNAL NOTE:
// Purpose: Filters sidebar component for portfolio v0 with type, ownership, and grade filters
// Exports: FiltersSidebarV0 component
// Feature: my-portfolio-v0
// Dependencies: react, lucide-react, @/components/ui, ./filter-provider-v0

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, ListFilter } from 'lucide-react';
import { useFiltersV0 } from './filter-provider-v0';
import { Asset } from '@shared/schema';

interface FiltersSidebarV0Props {
  assets: Asset[];
  onHide?: () => void;
}

export function FiltersSidebarV0({ assets, onHide }: FiltersSidebarV0Props) {
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

  // Collapsible states (grade open by default now)
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

  return (
    <div className="w-64 xl:w-64 2xl:w-64 border-r border-border flex-shrink-0 h-[calc(100vh-4rem)] bg-background/50 flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 px-4 pb-1">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => onHide?.()}
            aria-label="Hide filters sidebar"
          >
            <span className="inline-flex items-center gap-1"><ListFilter className="h-4 w-4" /> Hide Filters</span>
          </Button>
          {activeCount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{activeCount} active</span>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs">
                Clear
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 space-y-4">
        {/* Card Type */}
        <div className="space-y-3">
          {renderHeader('Card Type', 'cardType')}
          {openSections.cardType && (
            <div className="flex flex-wrap gap-2">
              {typeOptions.map((type) => (
                <Badge
                  key={type}
                  variant={chipVariant(typeFilter.includes(type))}
                  className="cursor-pointer capitalize"
                  onClick={() => {
                    if (typeFilter.includes(type)) {
                      setTypeFilter(typeFilter.filter(t => t !== type));
                    } else {
                      setTypeFilter([...typeFilter, type]);
                    }
                  }}
                >
                  {type}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Ownership */}
        <div className="space-y-3">
          {renderHeader('Ownership', 'ownership')}
          {openSections.ownership && (
            <div className="flex flex-wrap gap-2">
              {ownershipOptions.map((ownership) => (
                <Badge
                  key={ownership}
                  variant={chipVariant(ownershipFilter.includes(ownership))}
                  className="cursor-pointer capitalize"
                  onClick={() => {
                    if (ownershipFilter.includes(ownership)) {
                      setOwnershipFilter(ownershipFilter.filter(o => o !== ownership));
                    } else {
                      setOwnershipFilter([...ownershipFilter, ownership]);
                    }
                  }}
                >
                  {ownership}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Grade */}
        <div className="space-y-3">
          {renderHeader('Grade', 'grade')}
          {openSections.grade && (
            <div className="flex flex-wrap gap-2">
              {gradeOptions.map((grade) => (
                <Badge
                  key={grade}
                  variant={chipVariant(gradeFilter.includes(grade))}
                  className="cursor-pointer"
                  onClick={() => {
                    if (gradeFilter.includes(grade)) {
                      setGradeFilter(gradeFilter.filter(g => g !== grade));
                    } else {
                      setGradeFilter([...gradeFilter, grade]);
                    }
                  }}
                >
                  {grade}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}