import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider";

export default function EmailConfirmed() {
  const [_, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const handleEmailConfirmation = async () => {
      try {
        // Get the current session to check if email is confirmed
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error("Session error:", sessionError);
          setError("Failed to verify email confirmation");
          setIsLoading(false);
          return;
        }

        const authUser = sessionData.session?.user || null;
        if (authUser?.email_confirmed_at) {
          setIsConfirmed(true);

          // Try to ensure a corresponding app user exists (create via invite code if missing)
          try {
            const resp = await fetch(`/api/user/${authUser.id}`);
            if (resp.status === 404) {
              const inviteCode = authUser.user_metadata?.inviteCode?.toString().trim().toUpperCase();
              if (inviteCode) {
                const sync = await fetch('/api/auth/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: authUser.id, email: authUser.email, inviteCode }),
                });
                if (!sync.ok) {
                  const j = await sync.json().catch(() => ({}));
                  setError(j?.error || 'Account setup failed. Please sign in to continue.');
                }
              } else {
                setError('Invite code missing. Please sign in and try again.');
              }
            }
          } catch (e) {
            setError('Account setup incomplete. Please sign in to continue.');
          }

          toast({
            title: "Email confirmed successfully!",
            description: "Welcome to Slabfy! You can now access your account.",
          });
        } else if (authUser) {
          setError("Email confirmation is still pending");
        } else {
          setError("No active session found");
        }
      } catch (error) {
        console.error("Email confirmation error:", error);
        setError("An unexpected error occurred");
      } finally {
        setIsLoading(false);
      }
    };

    // Handle the auth state change from the confirmation link
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await handleEmailConfirmation();
        }
      }
    );

    // Also check immediately in case user is already signed in
    handleEmailConfirmation();

    return () => {
      subscription.unsubscribe();
    };
  }, [toast]);

  const handleContinue = () => {
    if (!isConfirmed) {
      setLocation("/signin");
      return;
    }

    // If we don't have an app user yet, send to signin to trigger full flow instead of bouncing
    if (!user) {
      setLocation("/signin?confirmed=1");
      return;
    }

    // Check onboarding status
    if (user.onboardingComplete === "true") {
      setLocation("/dashboard");
    } else {
      setLocation("/onboarding/step1");
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col justify-center items-center px-6 py-12 lg:px-8 bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Confirming your email...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-background text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Logo />
        
        <div className="mt-6 text-center">
          {isConfirmed ? (
            <>
              <CheckCircle className="mx-auto h-16 w-16 text-success mb-4" />
              <h2 className="text-2xl font-bold font-heading leading-9 tracking-tight text-foreground">
                Email Confirmed!
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your email has been successfully confirmed. Welcome to Slabfy!
              </p>
            </>
          ) : (
            <>
              <AlertCircle className="mx-auto h-16 w-16 text-destructive mb-4" />
              <h2 className="text-2xl font-bold font-heading leading-9 tracking-tight text-foreground">
                Confirmation Failed
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {error || "We couldn't confirm your email address. Please try again."}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <Button 
          onClick={handleContinue}
          className="w-full"
        >
          {isConfirmed 
            ? (user ? (user.onboardingComplete === "true" ? "Continue to Dashboard" : "Continue to Onboarding") : "Sign in to continue")
            : "Back to Sign In"
          }
        </Button>
        
        {!isConfirmed && (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Need help?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={() => setLocation("/signin")}
            >
              Try signing in again
            </Button>
          </p>
        )}
      </div>
    </div>
  );
}