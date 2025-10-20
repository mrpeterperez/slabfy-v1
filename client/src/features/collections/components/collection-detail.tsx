// 🤖 INTERNAL NOTE:
// Purpose: Main collection detail page with left navigation
// Exports: CollectionDetail component
// Feature: collections
// Dependencies: ./hooks, ./components, ./sections

import { useState } from 'react';
import { useLocation, useParams } from 'wouter';

import { cn } from '@/lib/utils';
import { 
  AlertCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DetailPageHeader, type DetailPageNavItem, type DetailActionItem } from '@/components/layout';
import { Package, Settings, Archive, ArchiveRestore, Trash2 } from 'lucide-react';
import { CollectionVisibilityPill } from '@/components/status';
import { useCollection } from '../hooks/use-collections';

// Import section components
import { AssetsSection } from './sections/AssetsSection';
import { SettingsSection } from './sections/SettingsSection';
import { CollectionErrorBoundary } from './error-boundary';
import { validateCollection } from '../utils/validation';

type TabType = 'assets' | 'settings';

// Loading skeleton component
function CollectionSkeleton() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="space-y-4">
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-4 bg-muted rounded w-1/2"></div>
      </div>
      <div className="grid gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded"></div>
        ))}
      </div>
    </div>
  );
}

// Error display component
function CollectionError({ error }: { error: Error }) {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error.message || 'Failed to load collection. Please try again.'}
        </AlertDescription>
      </Alert>
    </div>
  );
}

// Validation error component
function ValidationError({ validation }: { validation: any }) {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Unable to display collection due to invalid data.
        </AlertDescription>
      </Alert>
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer text-muted-foreground">
            Show validation errors
          </summary>
          <pre className="mt-2 p-3 bg-muted rounded text-xs overflow-auto">
            {JSON.stringify(validation, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

// Navigation component extracted into CollectionLeftNav

export function CollectionDetail() {
  const { id: collectionId } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  
  // Determine active section from URL
  const basePath = `/collections/${collectionId}`;
  const activeTab: TabType = location === basePath ? 'assets' : 
                            location === `${basePath}/settings` ? 'settings' : 'assets';

  // Data hooks
  const { data: collection, error, isLoading } = useCollection(collectionId);

  // Navigation items for collections
  const navigationItems: DetailPageNavItem[] = [
    { id: 'assets', label: 'Assets', path: '', icon: Package },
    { id: 'settings', label: 'Settings', path: '/settings', icon: Settings }
  ];

  // Action items for collections  
  const actionItems: DetailActionItem[] = [
    ...(collection?.archived ? [
      { 
        id: 'restore', 
        label: 'Restore', 
        icon: ArchiveRestore, 
        onClick: () => {/* TODO: implement restore */}
      },
      { 
        id: 'delete', 
        label: 'Delete Permanently', 
        icon: Trash2, 
        onClick: () => {/* TODO: implement delete */},
        variant: 'destructive' as const
      }
    ] : [
      { 
        id: 'archive', 
        label: 'Archive', 
        icon: Archive, 
        onClick: () => {/* TODO: implement archive */}
      }
    ])
  ];

  // Handle invalid collection ID
  if (!collectionId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid collection ID. Please check the URL and try again.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Handle loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailPageHeader
          title="Loading..."
          isLoading={true}
          basePath={basePath}
          currentTab={activeTab}
          navigationItems={navigationItems}
          actionItems={actionItems}
        />
        <div className="w-full">
          <CollectionSkeleton />
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <DetailPageHeader
          title="Error"
          isLoading={false}
          basePath={basePath}
          currentTab={activeTab}
          navigationItems={navigationItems}
          actionItems={actionItems}
        />
        <div className="w-full">
          <CollectionError error={error} />
        </div>
      </div>
    );
  }

  const renderActiveSection = () => {
    if (!collection) return null;

    // Validate data before rendering
    const collectionValidation = validateCollection(collection);
    if (!collectionValidation.success) {
      return <ValidationError validation={collectionValidation} />;
    }

    const sectionProps = { collection };

    switch (activeTab) {
      case 'assets':
        return (
          <CollectionErrorBoundary>
            <AssetsSection {...sectionProps} />
          </CollectionErrorBoundary>
        );
      
      case 'settings':
        return (
          <CollectionErrorBoundary>
            <SettingsSection {...sectionProps} />
          </CollectionErrorBoundary>
        );
      default:
        return (
          <CollectionErrorBoundary>
            <AssetsSection {...sectionProps} />
          </CollectionErrorBoundary>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DetailPageHeader 
        title={collection?.name || 'Untitled Collection'}
        thumbnailUrl={collection?.thumbnailUrl || collection?.coverImageUrl || undefined}
        statusPill={typeof collection?.isPublic !== 'undefined' ? (
          <CollectionVisibilityPill isPublic={!!collection.isPublic} size="sm" />
        ) : undefined}
        basePath={basePath}
        currentTab={activeTab}
        navigationItems={navigationItems}
        actionItems={actionItems}
        onNavigate={(tabId: string) => {
          const path = tabId === 'assets' ? basePath : `${basePath}/settings`;
          setLocation(path);
        }}
      />
      
      {/* Main Content Area - Full width, no padding */}
      <div className="w-full">
        {renderActiveSection()}
      </div>
    </div>
  );
}