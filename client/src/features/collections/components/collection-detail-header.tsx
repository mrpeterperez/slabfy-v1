// 🤖 INTERNAL NOTE:
// Purpose: Header component for collection management pages with navigation and actions
// Exports: CollectionHeader component
// Feature: collections
// Dependencies: @/components/ui, @/components/auth-provider, wouter

// No back arrow; breadcrumbs handle navigation
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CollectionVisibilityPill } from '@/components/status';
import { Package, Settings, MoreHorizontal, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';

interface CollectionHeaderProps {
  collection?: any; // TODO: proper type from schema
  // Navigation props
  basePath?: string;
  currentTab?: 'assets' | 'settings';
  onNavigate?: (tab: string) => void;
  // Action props
  onArchive?: () => void;
  onUnarchive?: () => void;  
  onDelete?: () => void;
  isArchiving?: boolean;
  isUnarchiving?: boolean;
  isDeleting?: boolean;
}

// Reusable collection info component
function CollectionInfo({ collection, compact = false }: { collection?: any; compact?: boolean }) {
  const thumb = (collection?.thumbnailUrl || collection?.coverImageUrl) as string | undefined;
  const collectionTitle = collection?.name || 'Untitled Collection';
  const isPublic: boolean | undefined = collection?.isPublic;
  
  if (!collection) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {thumb ? (
        <img 
          src={thumb} 
          alt="Collection thumbnail" 
          className="w-10 h-10 rounded-md border border-border object-cover flex-shrink-0" 
        />
      ) : (
        <div
          className="w-10 h-10 rounded-md border border-border bg-secondary/5 flex-shrink-0 flex items-center justify-center"
          aria-label={`Placeholder for ${collectionTitle}`}
        >
          <span className="text-sm font-medium text-muted-foreground select-none">
            {(collectionTitle?.trim()?.charAt(0)?.toUpperCase() || 'C')}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className={`font-heading font-bold text-foreground leading-tight truncate ${compact ? 'text-xl' : 'text-2xl'}`}>
            {collectionTitle}
          </h1>
          {typeof isPublic !== 'undefined' && (
            <CollectionVisibilityPill isPublic={!!isPublic} size={compact ? 'sm' : 'sm'} />
          )}
        </div>
      </div>
    </div>
  );
}

export function CollectionHeader({ 
  collection,
  basePath,
  currentTab = 'assets',
  onNavigate,
  onArchive,
  onUnarchive, 
  onDelete,
  isArchiving,
  isUnarchiving,
  isDeleting
}: CollectionHeaderProps) {
  const [location, setLocation] = useLocation();

  // Navigation items
  const navItems = [
    { id: 'assets', label: 'Assets', icon: Package, path: '' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' }
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (basePath) {
      const fullPath = item.path === '' ? basePath : `${basePath}${item.path}`;
      setLocation(fullPath);
    }
    onNavigate?.(item.id);
  };

  const isArchived = collection?.archived;

  return (
    <header className="bg-background border-b border-border">
      <div className="mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex h-16 items-center w-full">
          
          {/* Left Side - Collection Info */}
          <div className="flex items-center min-w-0 flex-1">
            <CollectionInfo collection={collection} />
          </div>

          {/* Right Side - Navigation + Actions */}
          <div className="flex items-center space-x-4">
            {/* Navigation Tabs */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      "hover:bg-muted hover:text-foreground text-muted-foreground",
                      isActive && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Separator */}
            <div className="hidden md:block h-6 w-px bg-border"></div>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  disabled={!!(isArchiving || isUnarchiving || isDeleting)} 
                  aria-disabled={!!(isArchiving || isUnarchiving || isDeleting)}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isArchived ? (
                  <>
                    {onUnarchive && (
                      <DropdownMenuItem onClick={onUnarchive} disabled={!!isUnarchiving}>
                        <ArchiveRestore className="mr-2 h-4 w-4" />
                        Restore
                      </DropdownMenuItem>
                    )}
                    {onDelete && (
                      <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive" disabled={!!isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Permanently
                      </DropdownMenuItem>
                    )}
                  </>
                ) : (
                  <>
                    {onArchive && (
                      <DropdownMenuItem onClick={onArchive} disabled={!!isArchiving}>
                        <Archive className="mr-2 h-4 w-4" />
                        Archive
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Navigation - Show as bottom tabs on mobile if needed */}
            <div className="md:hidden">
              {/* Mobile nav could be handled separately if needed */}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
