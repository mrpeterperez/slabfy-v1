// 🤖 INTERNAL NOTE:
// Purpose: Unified header for all detail pages with inline navigation and actions
// Exports: DetailPageHeader component, DetailPageHeaderProps interface
// Feature: shared layout component
// Dependencies: wouter, shadcn navigation-menu, lucide-react

import React from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal } from 'lucide-react';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

// Navigation item interface
export interface DetailNavItem {
  id: string;
  label: string;
  path: string; // relative path (e.g., '', '/settings')
  icon?: React.ComponentType<{ className?: string }>;
}

// Action item interface  
export interface DetailActionItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

// Header props interface
export interface DetailPageHeaderProps {
  // Content
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  statusPill?: React.ReactNode;
  
  // Navigation
  basePath?: string;
  currentTab?: string;
  navigationItems?: DetailNavItem[];
  onNavigate?: (itemId: string) => void;
  
  // Actions
  actionItems?: DetailActionItem[];
  
  // Loading state
  isLoading?: boolean;
  
  // Custom content
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  
  className?: string;
}

// Reusable info section with thumbnail/title/status
function HeaderInfo({ 
  title, 
  subtitle, 
  thumbnailUrl, 
  statusPill, 
  isLoading = false, 
  compact = false 
}: {
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  statusPill?: React.ReactNode;
  isLoading?: boolean;
  compact?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-5 w-32" />
          {subtitle && <Skeleton className="h-4 w-24" />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {thumbnailUrl ? (
        <img 
          src={thumbnailUrl} 
          alt={`${title} thumbnail`} 
          className="w-10 h-10 rounded-md border border-border object-cover flex-shrink-0" 
        />
      ) : (
        <div
          className="w-10 h-10 rounded-md border border-border bg-secondary/5 flex-shrink-0 flex items-center justify-center"
          aria-label={`Placeholder for ${title}`}
        >
          <span className="text-sm font-medium text-muted-foreground select-none">
            {title?.trim()?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
      )}
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className={`font-heading font-bold text-foreground leading-tight truncate ${compact ? 'text-xl' : 'text-2xl'}`}>
            {title}
          </h1>
          {statusPill}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

export function DetailPageHeader({
  title,
  subtitle,
  thumbnailUrl,
  statusPill,
  basePath,
  currentTab,
  navigationItems = [],
  onNavigate,
  actionItems = [],
  isLoading = false,
  leftContent,
  rightContent,
  className
}: DetailPageHeaderProps) {
  const [location, setLocation] = useLocation();

  const handleNavClick = (item: DetailNavItem) => {
    if (basePath) {
      const fullPath = item.path === '' ? basePath : `${basePath}${item.path}`;
      setLocation(fullPath);
    }
    onNavigate?.(item.id);
  };

  return (
    <header className={cn("bg-background border-b border-border", className)}>
      <div className="mx-auto px-4 sm:px-6 lg:px-4">
        <div className="flex h-16 items-center w-full">
          
          {/* Left Side - Custom content or default info - ALWAYS flex-1 for balance */}
          <div className="flex items-center min-w-0 flex-1">
            {leftContent || (
              <HeaderInfo 
                title={title}
                subtitle={subtitle}
                thumbnailUrl={thumbnailUrl}
                statusPill={statusPill}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Right - Navigation Tabs (when not using rightContent) */}
          {navigationItems.length > 0 && !rightContent && (
            <div className="hidden md:flex items-center justify-end flex-1">
              <div className="flex items-center space-x-1">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      disabled={isLoading}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        "hover:bg-muted hover:text-foreground text-muted-foreground",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        isActive && "bg-primary/10 text-primary font-medium"
                      )}
                    >
                      {Icon && <Icon className="h-4 w-4" />}
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Right Side - Actions or custom content */}
          {rightContent ? (
            // Custom rightContent gets full remaining space (no extra wrapper)
            rightContent
          ) : (
            // Default actions menu aligned to the right
            <div className="flex items-center ml-auto space-x-2">
              {actionItems.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      disabled={isLoading}
                      aria-disabled={isLoading}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      {actionItems.map((action) => {
                        const Icon = action.icon;
                        return (
                          <DropdownMenuItem 
                            key={action.id}
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className={action.variant === 'destructive' ? 
                              "text-destructive focus:text-destructive" : undefined
                            }
                          >
                            {Icon && <Icon className="mr-2 h-4 w-4" />}
                            {action.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
        </div>
      </div>
    </header>
  );
}