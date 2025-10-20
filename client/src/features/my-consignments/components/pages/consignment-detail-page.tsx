// 🤖 INTERNAL NOTE:
// Purpose: Main consignment detail/management page with left navigation
// Exports: ConsignmentDetailPage component  
// Feature: my-consignments
// Dependencies: ../../hooks, ../sections, @/components/ui

import { useState } from 'react';
import { useParams, useLocation } from 'wouter';

// Unified header component
import { DetailPageHeader, type DetailPageNavItem, type DetailActionItem } from '@/components/layout';
import { 
  DollarSign, 
  Package, 
  Settings,
  Archive,
  ArchiveRestore,
  Trash2
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConsignment, useArchiveConsignment, useUnarchiveConsignment, useDeleteConsignment } from '../../hooks/use-consignments';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Import section components
import { AssetsSection, EarningsSection, SettingsSection } from '../sections';
import { ConsignmentErrorBoundary } from '../error-boundary';
import { validateConsignment, validateConsignor } from '../../utils/validation';
import type { ConsignorWithContact, ConsignmentWithDetails } from '@shared/schema';

type TabType = 'earnings' | 'assets' | 'settings';

// Navigation items for consignments
const navigationItems: DetailPageNavItem[] = [
  { id: 'assets', label: 'Assets', path: '', icon: Package },
  { id: 'earnings', label: 'Earnings', path: '/earnings', icon: DollarSign },
  { id: 'settings', label: 'Settings', path: '/settings', icon: Settings }
];

export function ConsignmentDetailPage() {
  const { id: consignmentId } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  
  // Determine active section from URL
  const basePath = `/consignments/${consignmentId}`;
  const activeTab: TabType = location === basePath ? 'assets' : 
                            location === `${basePath}/earnings` ? 'earnings' : 
                            location === `${basePath}/settings` ? 'settings' : 'assets';

  // Data hooks - consignor is now included in consignment response!
  const { data: consignment, isLoading: consignmentLoading } = useConsignment(consignmentId);
  const consignor = consignment?.consignor; // Extract consignor from nested data
  const archiveConsignment = useArchiveConsignment();
  const unarchiveConsignment = useUnarchiveConsignment();
  const deleteConsignment = useDeleteConsignment();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Action items for consignments
  const actionItems: DetailActionItem[] = consignment ? [
    ...(consignment.archived ? [
      { 
        id: 'restore', 
        label: 'Restore', 
        icon: ArchiveRestore, 
        onClick: () => unarchiveConsignment.mutate(consignment.id),
        disabled: unarchiveConsignment.isPending
      },
      { 
        id: 'delete', 
        label: 'Delete Permanently', 
        icon: Trash2, 
        onClick: () => setConfirmOpen(true),
        variant: 'destructive' as const,
        disabled: deleteConsignment.isPending
      }
    ] : [
      { 
        id: 'archive', 
        label: 'Archive', 
        icon: Archive, 
        onClick: () => archiveConsignment.mutate(consignment.id),
        disabled: archiveConsignment.isPending
      }
    ])
  ] : [];

  if (!consignmentId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg font-medium text-destructive">Invalid consignment ID</p>
          <p className="text-sm text-muted-foreground mt-2">Please check the URL and try again.</p>
        </div>
      </div>
    );
  }

  const renderActiveSection = () => {
    if (consignmentLoading) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-muted-foreground">Loading consignment details...</p>
          </div>
        </div>
      );
    }

    if (!consignment) {
      return (
        <div className="flex items-center justify-center p-12">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">Consignment not found</p>
            <p className="text-sm text-muted-foreground mt-2">This consignment may have been deleted or you may not have access to it.</p>
          </div>
        </div>
      );
    }

    // Validate data before rendering
    const consignmentValidation = validateConsignment(consignment);
    // Consignor can be null, only validate if it exists
    const consignorValidation = consignor ? validateConsignor(consignor) : { success: true, data: null, error: null };

    if (!consignmentValidation.success || !consignorValidation.success) {
      return (
        <div className="p-6 text-center">
          <p className="text-destructive">Invalid data received from server</p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-xs text-left">
              <summary>Validation errors</summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                {JSON.stringify({ consignmentValidation, consignorValidation }, null, 2)}
              </pre>
            </details>
          )}
        </div>
      );
    }

    // Type-safe casting with validation
    const consignmentWithDetails = consignment as ConsignmentWithDetails;
    
    // Create fallback consignor if none exists
    const consignorWithContact = (consignor || {
      id: '',
      name: 'Unknown Consignor',
      email: null,
      phone: null,
      companyName: null,
      contact: undefined
    }) as ConsignorWithContact;

    switch (activeTab) {
      case 'earnings':
        return (
          <ConsignmentErrorBoundary>
            <EarningsSection consignment={consignmentWithDetails} consignor={consignorWithContact} />
          </ConsignmentErrorBoundary>
        );
      case 'assets':
        return (
          <ConsignmentErrorBoundary>
            <AssetsSection consignment={consignmentWithDetails} consignor={consignorWithContact} />
          </ConsignmentErrorBoundary>
        );
      case 'settings':
        return (
          <ConsignmentErrorBoundary>
            <SettingsSection consignment={consignmentWithDetails} consignor={consignorWithContact} />
          </ConsignmentErrorBoundary>
        );
      default:
        return (
          <ConsignmentErrorBoundary>
            <EarningsSection consignment={consignmentWithDetails} consignor={consignorWithContact} />
          </ConsignmentErrorBoundary>
        );
    }
  };

  const id = consignmentId;

  return (
    <div className="min-h-screen bg-background">
      {/* Unified Header with Navigation */}
      <DetailPageHeader 
        title={consignment?.title || 'Consignment'}
        subtitle={consignor?.contact?.name || 'Loading consignor...'}
        basePath={basePath}
        currentTab={activeTab}
        navigationItems={navigationItems}
        actionItems={actionItems}
        isLoading={consignmentLoading}
        onNavigate={(tabId: string) => {
          const path = tabId === 'assets' ? basePath : 
                      tabId === 'earnings' ? `${basePath}/earnings` :
                      `${basePath}/settings`;
          setLocation(path);
        }}
      />

      {/* Main Content Area - Full width, no padding */}
      <div className="w-full">
        {renderActiveSection()}
      </div>

      {/* Confirm Delete Dialog */}
      {consignment && (
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{consignment.archived ? 'Delete Permanently' : 'Delete Consignment'}</DialogTitle>
              <DialogDescription>
                {consignment.archived
                  ? `Permanently delete "${consignment.title}"? This cannot be undone.`
                  : `Are you sure you want to delete "${consignment.title}"? This action cannot be undone and will remove all associated assets.`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button 
                variant="destructive"
                onClick={async () => {
                  try {
                    await deleteConsignment.mutateAsync(consignment.id);
                    setConfirmOpen(false);
                    setLocation('/consignments');
                  } catch (error) {
                    // error toast handled in hook
                  }
                }}
              >
                {consignment.archived ? 'Delete Permanently' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}