// Deprecated: This legacy page now redirects to the canonical route `/my-portfolio`.
// Keep this file only for safety; it's not referenced by the router anymore.
import { useEffect } from 'react';
import { useLocation } from 'wouter';

export default function PortfolioV2Redirect() {
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Replace any deep path under /portfolio-v2 with /my-portfolio equivalent
    const target = window.location.pathname.replace('/portfolio-v2', '/my-portfolio');
    console.warn('[deprecate] /portfolio-v2 is deprecated; redirecting to', target);
    setLocation(target);
  }, [setLocation]);

  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to My Portfolio…</p>
      </div>
    </div>
  );
}