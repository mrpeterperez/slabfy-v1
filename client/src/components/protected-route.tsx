import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLocation } from "wouter";

/**
 * ProtectedRoute
 * - Guards routes behind authentication
 * - Optionally enforces onboarding completion and redirects to onboarding when needed
 */
export function ProtectedRoute({
  children,
  redirectPath = "/signin",
  /**
   * Skip redirecting to onboarding for routes that ARE the onboarding flow itself
   * Example usage for onboarding pages: <ProtectedRoute skipOnboardingCheck>
   */
  skipOnboardingCheck = false,
}: {
  children: React.ReactNode;
  redirectPath?: string;
  skipOnboardingCheck?: boolean;
}) {
  const { user, loading } = useAuth();
  const [path, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation(redirectPath);
      return;
    }

    // If authenticated but onboarding not complete, force onboarding unless explicitly skipped
    if (!loading && user && user.onboardingComplete !== "true" && !skipOnboardingCheck) {
      // Allow navigation within onboarding routes without loops
      const isOnboardingRoute = typeof path === "string" && path.startsWith("/onboarding");
      if (!isOnboardingRoute) {
        setLocation("/onboarding/step1");
      }
    }
  }, [user, loading, setLocation, redirectPath, skipOnboardingCheck, path]);

  // Show loading spinner while authentication is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Only render children if user is authenticated
  // If not authenticated, redirect happens via useEffect above
  return user ? <>{children}</> : (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}
