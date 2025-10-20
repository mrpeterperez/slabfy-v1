// 🤖 INTERNAL NOTE:
// Purpose: Central route configuration for code splitting and lazy loading
// Exports: routeConfig, preloadRoute utilities
// Feature: core routing optimization
// Dependencies: react

import { lazy, ComponentType, LazyExoticComponent } from 'react';

// Route prefetch priority levels
export enum RoutePriority {
  CRITICAL = 1,  // Load immediately (auth, landing)
  HIGH = 2,      // Preload on idle (main features)
  MEDIUM = 3,    // Load on hover/intent
  LOW = 4        // Load on demand only
}

interface RouteConfig {
  path: string;
  component: LazyExoticComponent<ComponentType<any>>;
  priority: RoutePriority;
  prefetch?: boolean;
  protected?: boolean;
}

// Centralized route configuration for optimal loading
export const routeConfig: RouteConfig[] = [
  // Critical auth routes
  {
    path: '/signin',
    component: lazy(() => import('@/pages/sign-in')),
    priority: RoutePriority.CRITICAL,
    prefetch: true,
    protected: false
  },
  {
    path: '/signup',
    component: lazy(() => import('@/pages/check-email')),
    priority: RoutePriority.CRITICAL,
    prefetch: true,
    protected: false
  },
  
  // High priority main features
  {
    path: '/my-portfolio',
    component: lazy(() => import('@/pages/my-portfolio')),
    priority: RoutePriority.HIGH,
    prefetch: true,
    protected: true
  },
  {
    path: '/dashboard',
    component: lazy(() => import('@/pages/dashboard-coming-soon')),
    priority: RoutePriority.HIGH,
    prefetch: true,
    protected: true
  },
  
  // Medium priority features
  {
    path: '/assets/:id',
    component: lazy(() => 
      import('@/features/asset-details').then(m => ({ default: m.AssetDetailPageV2 }))
    ),
    priority: RoutePriority.MEDIUM,
    protected: true
  },
  {
    path: '/consignments',
    component: lazy(() => 
      import('@/features/my-consignments/pages/consignments-page').then(m => ({ default: m.ConsignmentsPage }))
    ),
    priority: RoutePriority.MEDIUM,
    protected: true
  },
  
  // Low priority features
  {
  path: '/analytics',
  component: lazy(() => import('@/features/analytics').then(m => ({ default: m.AnalyticsPage }))),
    priority: RoutePriority.LOW,
    protected: true
  },
  {
    path: '/test-chart',
    component: lazy(() => import('@/pages/test-chart-page')),
    priority: RoutePriority.LOW,
    protected: true
  }
];

// Simple route preloading without accessing internal properties
export const preloadRoute = (path: string) => {
  // Route preloading disabled to prevent runtime errors
  // Components will load when needed
  console.debug('Route preload requested for:', path);
};

// Preload critical routes on idle (simplified)
export const preloadCriticalRoutes = () => {
  // Route preloading disabled to prevent runtime errors
  // React.lazy will handle loading when components are needed
  console.debug('Critical route preloading requested');
};