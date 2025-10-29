// 🤖 INTERNAL NOTE:
// Purpose: Unified header for all detail pages with inline navigation and actions
// Exports: DetailPageHeader component, DetailPageHeaderProps interface
// Feature: shared layout component
// Dependencies: wouter, shadcn navigation-menu, lucide-react

import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreHorizontal, ChevronLeft, X } from 'lucide-react';
import { createPortal } from 'react-dom';
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
  const [, setLocation] = useLocation();
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);

  const handleNavClick = (item: DetailNavItem) => {
    if (basePath) {
      const fullPath = item.path === '' ? basePath : `${basePath}${item.path}`;
      setLocation(fullPath);
    }
    onNavigate?.(item.id);
  };

  const handleMobileAction = (action: DetailActionItem) => {
    setMobileActionsOpen(false);
    // Small delay to let drawer close animation finish
    setTimeout(() => action.onClick(), 150);
  };

  return (
    <header className={cn("bg-background border-b border-border", className)}>
      <div className="mx-auto px-4 sm:px-6 lg:px-4">
        {/* Desktop Header */}
        <div className="hidden lg:flex h-16 items-center w-full">
          
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

        {/* Mobile Header - matching mobile-asset-header style */}
        <div className="lg:hidden flex h-16 items-center justify-between">
          {/* Back Button - Left */}
          <button
            onClick={() => window.history.go(-1)}
            className="flex items-center justify-center min-w-[48px] min-h-[48px] -ml-3"
            aria-label="Go back"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          {/* Title - Center */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center max-w-[60%]">
            <h1 className="text-base font-semibold truncate">
              Show Details
            </h1>
          </div>

          {/* 3-Dot Menu - Right */}
          <div className="flex items-center justify-center min-w-[48px] min-h-[48px]">
            {actionItems.length > 0 && (
              <button
                onClick={() => setMobileActionsOpen(true)}
                className="h-12 w-12 min-h-[3rem] min-w-[3rem] p-0 flex items-center justify-center"
                disabled={isLoading}
                aria-label="Open actions menu"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Actions Bottom Drawer */}
      {mobileActionsOpen && createPortal(
        <>
          {/* Backdrop */}
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-[9998] animate-in fade-in duration-200"
            onClick={() => setMobileActionsOpen(false)}
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
                <h2 className="text-lg font-semibold">Actions</h2>
                <button
                  onClick={() => setMobileActionsOpen(false)}
                  className="min-w-[48px] min-h-[48px] flex items-center justify-center -mr-3"
                  aria-label="Close actions menu"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Actions List */}
            <div className="flex-shrink-0 py-4 space-y-2">
              {actionItems.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleMobileAction(action)}
                    disabled={action.disabled}
                    className={cn(
                      "w-full flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors min-h-[56px]",
                      action.disabled && "opacity-50 cursor-not-allowed",
                      action.variant === 'destructive' && "text-destructive"
                    )}
                  >
                    {Icon && <Icon className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
                    <span className="text-base font-medium text-left">{action.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Bottom safe area padding */}
            <div className="h-4 flex-shrink-0" />
          </div>
        </>,
        document.body
      )}
    </header>
  );
}

// Mobile Page Title Component - renders outside header
export function MobilePageTitle({ title }: { title?: string }) {
  if (!title) return null;
  
  return (
    <div className="lg:hidden px-4 pt-6 pb-4">
      <h1 className="text-[34px] font-bold leading-none">{title}</h1>
    </div>
  );
}