import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { useLocation } from "wouter";

export function ProtectedRoute({ children, redirectPath = "/signin" }: { children: React.ReactNode, redirectPath?: string }) {
  const { user, loading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      console.log('ProtectedRoute: redirecting to', redirectPath);
      setLocation(redirectPath);
    }
  }, [user, loading, setLocation, redirectPath]);

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
