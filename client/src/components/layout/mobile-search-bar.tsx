// Mobile Search Bar
// Full-width search overlay that appears over the mobile header
// Z-index higher than header to overlay avatar

import { useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

interface MobileSearchBarProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

export function MobileSearchBar({ 
  isOpen, 
  onClose, 
  searchQuery, 
  onSearchChange,
  placeholder = "Search..."
}: MobileSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Focus input when opened
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="lg:hidden fixed top-0 inset-x-0 z-50 border-b bg-background">
      <div className="mx-auto max-w-screen-md px-4">
        <div className="flex h-16 items-center gap-3">
          {/* Search Input - Full Width */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-4 h-11 text-base"
            />
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] -mr-3"
            aria-label="Close search"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
