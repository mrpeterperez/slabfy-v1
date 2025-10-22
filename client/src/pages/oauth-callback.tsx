import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";

export default function OAuthCallback() {
  const [_, setLocation] = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth loading to complete
    if (loading) {
      console.log("OAuth callback: auth still loading...");
      return;
    }

    console.log("OAuth callback: auth loaded, user:", user?.email || "null");

    // Give auth-provider time to sync user from metadata
    const timer = setTimeout(() => {
      if (user) {
        console.log("OAuth callback: redirecting to dashboard");
        setLocation("/dashboard");
      } else {
        console.log("OAuth callback: no user after auth - likely needs invite code");
        // Auth-provider will handle showing error if invite code missing
        setLocation("/signup");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [user, loading, setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}