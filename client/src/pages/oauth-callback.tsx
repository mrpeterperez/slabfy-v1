import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { InviteGate } from "../../../features/invite-system";

export default function OAuthCallback() {
  const [_, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const [showInviteGate, setShowInviteGate] = useState(false);
  const [authProcessed, setAuthProcessed] = useState(false);

  useEffect(() => {
    // Wait for auth loading to complete before making decisions
    if (loading) {
      console.log("OAuth callback: auth still loading...");
      return;
    }

    console.log("OAuth callback: auth loaded, user:", user?.email || "null");

    // Set a timeout to handle auth processing
    const timer = setTimeout(() => {
      if (user && user.id && user.email && !user.email.includes("@example.com")) {
        // Valid user found with real email - check if they have complete profile
        if (user.onboardingComplete !== undefined) {
          console.log("OAuth callback: redirecting authenticated user to dashboard");
          setLocation("/dashboard");
        } else {
          console.log("OAuth callback: user found but incomplete, waiting...");
        }
      } else if (!authProcessed) {
        // No valid user found or user has fake email - needs invite code
        console.log("OAuth callback: no valid user found or fake email, showing invite gate");
        setShowInviteGate(true);
        setAuthProcessed(true);
      }
    }, 3000); // Give more time for auth sync to complete

    return () => clearTimeout(timer);
  }, [user, loading, setLocation, authProcessed]);

  // Handle successful invite code validation
  const handleValidInviteCode = (code: string) => {
    console.log("OAuth callback: valid invite code provided:", code);
    // Store the code and reload the page to trigger auth sync
    try {
      localStorage.setItem('slabfy_invite_code', code);
      // Force reload to trigger auth sync with invite code
      window.location.href = '/oauth-callback';
    } catch (error) {
      console.error("Failed to store invite code:", error);
    }
  };

  if (showInviteGate) {
    return (
      <InviteGate onValidCode={handleValidInviteCode}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Welcome to Slabfy!</h1>
            <p className="text-muted-foreground">Your account has been created successfully.</p>
          </div>
        </div>
      </InviteGate>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing sign in...</p>
        {!loading && !user && (
          <p className="text-sm text-muted-foreground mt-2">
            This is taking longer than expected. Please wait...
          </p>
        )}
      </div>
    </div>
  );
}