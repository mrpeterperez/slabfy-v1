/*
 * This file contains the third step of the onboarding process - completion screen.
 * Exports: OnboardingStep3 component
 * Feature: onboarding
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/supabase";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft } from "lucide-react";

export default function OnboardingStep3() {
  const { user, updateUserContext } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Redirect if no user
  useEffect(() => {
    if (!user) {
      setLocation("/signin");
      return;
    }
    // If onboarding already complete, don't show this page
    if (user.onboardingComplete === "true") {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const handleContinue = async () => {
    try {
      if (user?.id) {
        const updatedUser = await api.onboarding.completeOnboarding(user.id);
        // Update auth context immediately with returned user data
        updateUserContext(updatedUser);
      }
    } catch (e) {
      // Non-blocking: proceed even if marking completion fails
      console.warn("Failed to mark onboarding complete:", e);
    }
    toast({
      title: "Welcome to Slabfy!",
      description: "Your profile setup is complete",
    });
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <button
          onClick={() => setLocation("/onboarding/step2")}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Go back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="text-center">
          <div className="mx-auto mb-8">
            <Logo />
          </div>
          <h1 className="text-3xl font-bold">Welcome to Slabfy!</h1>
          <p className="text-muted-foreground mt-2">
            You're all set up and ready to start managing your assets
          </p>
        </div>

        <div className="space-y-6">
          <div className="text-center space-y-4">
            <div className="bg-muted rounded-lg p-6">
              <h3 className="font-semibold mb-2">What's Next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Add your first sports card</li>
                <li>• Track market values and pricing</li>
                <li>• Build your collection portfolio</li>
              </ul>
            </div>
          </div>

          <Button onClick={handleContinue} className="w-full">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
