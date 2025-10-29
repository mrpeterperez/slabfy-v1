// Mobile page title with expandable search
// Search expands in place, covering the title

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface MobilePageTitleWithSearchProps {
  title: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export function MobilePageTitleWithSearch({ 
  title, 
  searchValue, 
  onSearchChange, 
  searchPlaceholder = "Search..." 
}: MobilePageTitleWithSearchProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleClose = () => {
    setIsSearchOpen(false);
    onSearchChange('');
  };

  if (isSearchOpen) {
    return (
      <div className="lg:hidden px-4 pt-6 pb-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 h-12 text-base"
            />
          </div>
          <button
            onClick={handleClose}
            className="flex items-center justify-center min-w-[48px] min-h-[48px]"
            aria-label="Close search"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:hidden px-4 pt-6 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[34px] font-bold leading-none">{title}</h1>
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex items-center justify-center min-w-[48px] min-h-[48px]"
          aria-label="Search"
        >
          <Search className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}
