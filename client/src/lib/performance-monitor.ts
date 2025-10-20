// 🤖 INTERNAL NOTE:
// Purpose: Performance monitoring utilities for production
// Exports: performanceMonitor, reportWebVitals
// Feature: core performance monitoring
// Dependencies: none (vanilla JS)

// Track core web vitals
export interface WebVitals {
  FCP?: number;  // First Contentful Paint
  LCP?: number;  // Largest Contentful Paint
  FID?: number;  // First Input Delay
  CLS?: number;  // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

class PerformanceMonitor {
  private vitals: WebVitals = {};
  private resourceTimings: PerformanceResourceTiming[] = [];
  
  constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe Largest Contentful Paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        this.vitals.LCP = lastEntry.renderTime || lastEntry.loadTime;
        this.reportMetric('LCP', this.vitals.LCP);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.debug('LCP observer not supported');
    }

    // Observe First Input Delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as any;
        this.vitals.FID = firstEntry.processingStart - firstEntry.startTime;
        this.reportMetric('FID', this.vitals.FID);
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.debug('FID observer not supported');
    }

    // Observe Cumulative Layout Shift
    try {
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
          }
        }
        this.vitals.CLS = clsScore;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.debug('CLS observer not supported');
    }

    // Get Time to First Byte
    window.addEventListener('load', () => {
      const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navEntry) {
        this.vitals.TTFB = navEntry.responseStart - navEntry.fetchStart;
        this.vitals.FCP = navEntry.domContentLoadedEventEnd - navEntry.fetchStart;
        this.reportMetric('TTFB', this.vitals.TTFB);
        this.reportMetric('FCP', this.vitals.FCP);
      }
    });
  }

  // Report metric to analytics service
  private reportMetric(name: string, value: number | undefined) {
    if (value === undefined) return;
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Google Analytics
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'web_vitals', {
          event_category: 'Performance',
          event_label: name,
          value: Math.round(value),
          non_interaction: true,
        });
      }
      
      // Or send to custom endpoint
      if (value > this.getThreshold(name)) {
        console.warn(`Performance warning: ${name} = ${value}ms exceeds threshold`);
      }
    } else {
      console.debug(`Performance metric: ${name} = ${value}ms`);
    }
  }

  // Get performance thresholds
  private getThreshold(metric: string): number {
    const thresholds: Record<string, number> = {
      LCP: 2500,  // Good < 2.5s
      FID: 100,   // Good < 100ms
      CLS: 0.1,   // Good < 0.1
      TTFB: 800,  // Good < 800ms
      FCP: 1800,  // Good < 1.8s
    };
    return thresholds[metric] || Infinity;
  }

  // Get current vitals
  public getVitals(): WebVitals {
    return { ...this.vitals };
  }

  // Track resource loading
  public trackResourceLoading() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const slowResources = resources.filter(r => r.duration > 1000);
    
    if (slowResources.length > 0) {
      console.warn('Slow resources detected:', slowResources.map(r => ({
        name: r.name,
        duration: Math.round(r.duration),
        size: (r as any).transferSize || 0,
      })));
    }
    
    return resources;
  }

  // Get bundle size info
  public getBundleSizes() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => r.name.endsWith('.js'));
    const cssResources = resources.filter(r => r.name.endsWith('.css'));
    
    const totalJsSize = jsResources.reduce((sum, r) => sum + ((r as any).transferSize || 0), 0);
    const totalCssSize = cssResources.reduce((sum, r) => sum + ((r as any).transferSize || 0), 0);
    
    return {
      js: {
        count: jsResources.length,
        totalSize: totalJsSize,
        averageSize: jsResources.length ? totalJsSize / jsResources.length : 0,
      },
      css: {
        count: cssResources.length,
        totalSize: totalCssSize,
        averageSize: cssResources.length ? totalCssSize / cssResources.length : 0,
      },
      total: totalJsSize + totalCssSize,
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Web Vitals reporting function for use in components
export function reportWebVitals(onReport?: (vitals: WebVitals) => void) {
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const vitals = performanceMonitor.getVitals();
        onReport?.(vitals);
      }, 0);
    });
  }
}