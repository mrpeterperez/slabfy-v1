// 🤖 INTERNAL NOTE:
// Purpose: Main App component with optimized lazy loading for production scalability
// Exports: App component with code-split routes
// Feature: core routing
// Dependencies: wouter, react, @/components

import { Route, Switch } from "wouter";
import { lazy, Suspense, useEffect, useState, useMemo } from "react";
import { useLocation } from "wouter";
import { AppShell } from "@/components/layout/app-shell";
import { ProtectedRoute } from "@/components/protected-route";
import { ErrorBoundary } from "@/components/error-boundary";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
// Loading component
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
  </div>
);

// Lazy load all route components for code splitting
const SignIn = lazy(() => import("@/pages/sign-in"));
const CheckEmail = lazy(() => import("@/pages/check-email"));
const SignUp = lazy(() => import("@/pages/sign-up"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const EmailConfirmed = lazy(() => import("@/pages/email-confirmed"));
const OAuthCallback = lazy(() => import("@/pages/oauth-callback"));
const DashboardComingSoon = lazy(() => import("@/pages/dashboard-coming-soon"));
const Profile = lazy(() => import("@/pages/profile"));
const PortfolioPageOld = lazy(() => import("@/pages/portfolio"));
// const MyPortfolioPage = lazy(() => import("@/pages/my-portfolio")); // Using v0 instead
const MyPortfolioPageV0 = lazy(() => 
  import("@/features/my-portfolio-v0").then(m => ({ default: m.PortfolioPageV0 }))
);

// Portfolio page wrapper with delete/edit functionality
function MyPortfolioWithActions() {
  const [deleteAsset, setDeleteAsset] = useState<{ id: string; title?: string | null; playerName?: string | null } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Dev-User-Id': 'a6623803-0551-4ff7-8bab-fe0c7892cd13',
          'X-Dev-Email': 'peter@slabfy.com',
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete asset');
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all asset-related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/assets'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey[0] === '/api/user'
      });
      
      toast({
        title: "Asset deleted",
        description: "Asset deleted successfully."
      });
      setDeleteAsset(null);
    },
    onError: (error: any) => {
      console.error('Delete failed:', error);
      toast({
        title: "Error",
        description: "Failed to delete asset. Please try again.",
        variant: "destructive"
      });
    },
  });

  const handleDeleteAsset = (asset: { id: string; title?: string | null; playerName?: string | null }) => {
    setDeleteAsset(asset);
  };

  const confirmDelete = () => {
    if (deleteAsset) {
      deleteAssetMutation.mutate(deleteAsset.id);
    }
  };

  const handleEditAsset = (asset: { id: string }) => {
    // Navigate to asset detail page with edit mode
    window.location.href = `/assets/${asset.id}?edit=1`;
  };

  const assetName = deleteAsset?.title || deleteAsset?.playerName || 'this asset';

  // 🔥 DEV TOOL: Press Ctrl+Shift+R to clear ALL React Query cache
  useEffect(() => {
    const handleCacheClear = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        queryClient.clear();
        window.location.reload();
        console.log('🔥 Cache cleared and page reloaded!');
      }
    };
    
    window.addEventListener('keydown', handleCacheClear);
    return () => window.removeEventListener('keydown', handleCacheClear);
  }, [queryClient]);

  return (
    <>
      <MyPortfolioPageV0 
        onDeleteAsset={handleDeleteAsset}
        onEditAsset={handleEditAsset}
      />
      
      <AlertDialog open={!!deleteAsset} onOpenChange={() => setDeleteAsset(null)}>
        <AlertDialogContent data-testid="delete-asset-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{assetName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteAssetMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAssetMutation.isPending ? "Deleting..." : "Delete Asset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
const ChatsPage = lazy(() => import("@/pages/chats.tsx"));
const AIAgentPage = lazy(() => import("@/pages/ai-agent"));
// const TestChartPage = lazy(() => import("@/pages/test-chart-page")); // Commented out - file doesn't exist
const StarBorderDemoPage = lazy(() => import("@/pages/star-border-demo"));

// Feature components - lazy loaded
const AssetDetailPageV2 = lazy(() => 
  import("@/features/asset-details").then(m => ({ default: m.AssetDetailPageV2 }))
);
const ConsignmentsPage = lazy(() => 
  import("@/features/my-consignments/pages/consignments-page").then(m => ({ default: m.ConsignmentsPage }))
);
const ConsignmentDetailPage = lazy(() =>
  import("@/features/my-consignments/components/pages/consignment-detail-page").then(m => ({ default: m.ConsignmentDetailPage }))
);
const CollectionsList = lazy(() => 
  import("@/features/collections").then(m => ({ default: m.CollectionsList }))
);
const CollectionDetail = lazy(() => 
  import("@/features/collections").then(m => ({ default: m.CollectionDetail }))
);
const ContactsList = lazy(() => 
  import("@/features/contacts").then(m => ({ default: m.ContactsList }))
);
const ContactDetail = lazy(() => 
  import("@/features/contacts").then(m => ({ default: m.ContactDetail }))
);
const AnalyticsPageLazy = lazy(() => 
  import("@/pages/analytics")
);
const EventsPage = lazy(() => 
  import("@/pages/events").then(m => ({ default: m.EventsPage }))
);
const EventDetailPage = lazy(() => 
  import("@/features/events/components/event-detail/event-detail-page").then(m => ({ default: m.EventDetailPage }))
);
const ShowStorefrontSettings = lazy(() => 
  import("@/features/sales-channels/show-storefront/show-storefront-settings").then(m => ({ default: m.ShowStorefrontSettings }))
);
const PublicStorefrontPage = lazy(() => 
  import("@/features/sales-channels/show-storefront/components/public/public-storefront-page").then(m => ({ default: m.PublicStorefrontPage }))
);
const PublicEventStorefrontPage = lazy(() => 
  import("@/features/sales-channels/show-storefront/components/public/public-event-storefront-page").then(m => ({ default: m.PublicEventStorefrontPage }))
);
const PublicStorefrontAssetDetail = lazy(() => 
  import("@/features/sales-channels/show-storefront/components/public/public-storefront-asset-detail").then(m => ({ default: m.PublicStorefrontAssetDetail }))
);
const StorefrontCart = lazy(() => 
  import("@/features/sales-channels/show-storefront/components/public/storefront-cart").then(m => ({ default: m.StorefrontCart }))
);
const StorefrontCheckout = lazy(() => 
  import("@/features/sales-channels/show-storefront/components/public/storefront-checkout").then(m => ({ default: m.StorefrontCheckout }))
);
const StorefrontCheckoutRoute = lazy(() => 
  import("@/features/sales-channels/show-storefront/components/public/storefront-checkout-route").then(m => ({ default: m.StorefrontCheckoutRoute }))
);
const StorefrontWithCart = lazy(() =>
  import("@/features/sales-channels/show-storefront/components/public/storefront-with-cart").then(m => ({ default: m.StorefrontWithCart }))
);
const ComingSoon = lazy(() =>
  import("@/pages/coming-soon").then(m => ({ default: m.ComingSoon }))
);// Buying desk v0 features
const BuyingDeskPageV0 = lazy(() => 
  import("@/features/buying-desk-v0").then(m => ({ default: m.BuyingDeskPageV0 }))
);
const SessionDetailPageV0 = lazy(() => 
  import("@/features/buying-desk-v0").then(m => ({ default: m.SessionDetailPageV0 }))
);

// Onboarding flow
const OnboardingStep1 = lazy(() => import("@/features/onboarding/step1"));
const OnboardingStep2 = lazy(() => import("@/features/onboarding/step2"));
const OnboardingStep3 = lazy(() => import("@/features/onboarding/step3"));


// This component handles redirection after signup
function SignupRedirect() {
  const [_, setLocation] = useLocation();
  const userJson = typeof window !== 'undefined' ? localStorage.getItem('slabfy_user') : null;
  const onboardingComplete = (() => {
    try { return userJson ? (JSON.parse(userJson)?.onboardingComplete === 'true') : false; } catch { return false; }
  })();
  useEffect(() => {
    if (onboardingComplete) {
      setLocation("/dashboard");
    } else {
      setLocation("/onboarding/step1");
    }
  }, [setLocation, onboardingComplete]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

// Redirect unknown routes to signup to guide users through invite flow
function RedirectToSignup() {
  const [_, setLocation] = useLocation();
  
  useEffect(() => {
    setLocation("/signup");
  }, [setLocation]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

function App() {
  const [path] = useLocation();
  
  // Routes that should render WITHOUT AppShell (no sidebar, no breadcrumbs)
  const isPublicRoute = useMemo(() => {
    if (typeof path !== "string") return false;
    return (
      path === "/" ||
      path.startsWith("/signin") ||
      path.startsWith("/signup") ||
      path.startsWith("/check-email") ||
      path.startsWith("/reset-password") ||
      path.startsWith("/email-confirmed") ||
      path.startsWith("/oauth-callback") ||
      path.startsWith("/signup-complete") ||
      path.startsWith("/storefront/")
    );
  }, [path]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteLoader />}>
        <Switch>
          {/* Public routes rendered WITHOUT AppShell */}
          <Route path="/storefront/preview">
            <PublicStorefrontPage />
          </Route>
          <Route path="/storefront/:eventId/preview" component={PublicEventStorefrontPage} />
          <Route path="/storefront/:eventId" component={PublicEventStorefrontPage} />
          <Route path="/storefront/user/:userId">
            <PublicStorefrontPage />
          </Route>
          <Route path="/storefront/:userId/asset/:assetId">
            <PublicStorefrontAssetDetail />
          </Route>
          <Route path="/storefront/:userId/cart">
            <StorefrontWithCart>
              <StorefrontCart />
            </StorefrontWithCart>
          </Route>
          <Route path="/storefront/:userId/checkout">
            <StorefrontCheckoutRoute />
          </Route>
          
          <Route path="/signin" component={SignIn} />
          <Route path="/signup" component={SignUp} />
          <Route path="/check-email" component={CheckEmail} />
          <Route path="/reset-password" component={ResetPassword} />
          <Route path="/email-confirmed" component={EmailConfirmed} />
          <Route path="/oauth-callback" component={OAuthCallback} />
          <Route path="/signup-complete" component={SignupRedirect} />
          <Route path="/">
            <SignIn />
          </Route>
          
          {/* All other routes wrapped in AppShell */}
          <Route>
            <AppShell>
              <Switch>
  <Route path="/dashboard">
          <ProtectedRoute>
            <DashboardComingSoon />
          </ProtectedRoute>
        </Route>
        <Route path="/ai-agent">
          <ProtectedRoute>
            <AIAgentPage />
          </ProtectedRoute>
        </Route>
        <Route path="/onboarding/step1">
          <ProtectedRoute>
            <OnboardingStep1 />
          </ProtectedRoute>
        </Route>
        <Route path="/onboarding/step2">
          <ProtectedRoute>
            <OnboardingStep2 />
          </ProtectedRoute>
        </Route>
        <Route path="/onboarding/step3">
          <ProtectedRoute>
            <OnboardingStep3 />
          </ProtectedRoute>
        </Route>
        <Route path="/profile">
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        </Route>
        <Route path="/assets/:id">
          <ProtectedRoute>
            <AssetDetailPageV2 />
          </ProtectedRoute>
        </Route>
        <Route path="/assets/:id/:tab">
          <ProtectedRoute>
            <AssetDetailPageV2 />
          </ProtectedRoute>
        </Route>
        <Route path="/portfolio">
          <ProtectedRoute>
            <PortfolioPageOld />
          </ProtectedRoute>
        </Route>
        {/* My Portfolio - Clean URL */}
        <Route path="/my-portfolio">
          <ProtectedRoute>
            <MyPortfolioWithActions />
          </ProtectedRoute>
        </Route>
        <Route path="/chats">
          <ProtectedRoute>
            <ChatsPage />
          </ProtectedRoute>
        </Route>
        {/* Buying Desk - Clean URL */}
        <Route path="/buying-desk">
          <ProtectedRoute>
            <BuyingDeskPageV0 />
          </ProtectedRoute>
        </Route>
        <Route path="/buying-desk/:id">
          <ProtectedRoute>
            <SessionDetailPageV0 />
          </ProtectedRoute>
        </Route>
        <Route path="/buying-desk/:id/:tab">
          <ProtectedRoute>
            <SessionDetailPageV0 />
          </ProtectedRoute>
        </Route>

        {/* Events v1 default */}
        <Route path="/events">
          <ProtectedRoute>
            <EventsPage />
          </ProtectedRoute>
        </Route>
        <Route path="/events/:id">
          <ProtectedRoute>
            <EventDetailPage />
          </ProtectedRoute>
        </Route>
        <Route path="/events/:id/:tab">
          <ProtectedRoute>
            <EventDetailPage />
          </ProtectedRoute>
        </Route>

        {/* Show Storefront Settings */}
        <Route path="/settings/show-storefront">
          <ProtectedRoute>
            <ShowStorefrontSettings />
          </ProtectedRoute>
        </Route>

  {/* Legacy v2 routes removed */}
        
        <Route path="/consignments">
          <ProtectedRoute>
            <ConsignmentsPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/consignments/:id">
          <ProtectedRoute>
            <ConsignmentDetailPage />
          </ProtectedRoute>
        </Route>
        <Route path="/consignments/:id/:tab">
          <ProtectedRoute>
            <ConsignmentDetailPage />
          </ProtectedRoute>
        </Route>
        
        <Route path="/collections">
          <ProtectedRoute>
            <CollectionsList />
          </ProtectedRoute>
        </Route>
        
        <Route path="/collections/:id">
          <ProtectedRoute>
            <CollectionDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/collections/:id/:tab">
          <ProtectedRoute>
            <CollectionDetail />
          </ProtectedRoute>
        </Route>
        
        <Route path="/contacts">
          <ProtectedRoute>
            <ContactsList />
          </ProtectedRoute>
        </Route>
        
        <Route path="/contacts/:id">
          <ProtectedRoute>
            <ContactDetail />
          </ProtectedRoute>
        </Route>
        <Route path="/contacts/:id/:tab">
          <ProtectedRoute>
            <ContactDetail />
          </ProtectedRoute>
        </Route>
        
        <Route path="/analytics">
          <ProtectedRoute>
            <AnalyticsPageLazy />
          </ProtectedRoute>
        </Route>
        
        {/* <Route path="/test-chart">
          <ProtectedRoute>
            <TestChartPage />
          </ProtectedRoute>
        </Route> */}

        <Route path="/star-border-demo">
          <ProtectedRoute>
            <StarBorderDemoPage />
          </ProtectedRoute>
        </Route>

                <Route path="/coming-soon" component={ComingSoon} />
                
                <Route>
                  {/* Redirect all unknown routes to signup to guide users through invite flow */}
                  <RedirectToSignup />
                </Route>
              </Switch>
              {/* Global mobile bottom navigation for parent pages */}
              <MobileBottomNav />
            </AppShell>
          </Route>
        </Switch>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
