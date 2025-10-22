// 🔒 SECURITY: Server-side validation only, no client-side bypass possible
// This component blocks signup until a valid invite code is verified by the backend

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";

interface InviteGateProps {
  children: React.ReactNode;
  onValidCode: (code?: string) => void; // Optional code parameter for flexibility
}

export function InviteGate({ children, onValidCode }: InviteGateProps) {
  const [inviteCode, setInviteCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const { toast } = useToast();

  // Check if user already has a valid invite code in session
  useEffect(() => {
    const validatedCode = sessionStorage.getItem("slabfy_invite_validated");
    if (validatedCode === "true") {
      setIsValidated(true);
      onValidCode();
    }
  }, [onValidCode]);

  // If already validated, show the protected content
  if (isValidated) {
    return <>{children}</>;
  }

  const handleVerifyCode = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Invalid code",
        description: "Please enter an invite code",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);

    try {
      // 🔒 SECURITY: Server-side validation - can't be bypassed
      const response = await fetch("/api/invite-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inviteCode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (data.isValid === true) {
        // Just store validation in session (cleared on browser close)
        sessionStorage.setItem("slabfy_invite_validated", "true");
        
        setIsValidated(true);
        onValidCode(inviteCode.trim().toUpperCase()); // Pass code to parent - THEY store it in Supabase metadata
        
        toast({
          title: "Welcome! 🎉",
          description: "Your invite code is valid. Let's get you signed up!",
        });
      } else {
        toast({
          title: "Invalid invite code",
          description: data.error || "This invite code doesn't exist or has already been used.",
          variant: "destructive",
        });
        setInviteCode("");
      }
    } catch (error) {
      console.error("Error validating invite code:", error);
      toast({
        title: "Verification failed",
        description: "Unable to verify invite code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isVerifying) {
      handleVerifyCode();
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-background text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Logo />
        <h2 className="mt-6 text-center text-2xl font-bold font-heading leading-9 tracking-tight text-foreground">
          Welcome to Slabfy
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          Enter your invite code to continue
        </p>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <div className="space-y-6">
          <div>
            <label htmlFor="invite-code" className="block text-sm font-medium leading-6 text-foreground">
              Invite Code
            </label>
            <div className="mt-2">
              <Input
                id="invite-code"
                type="text"
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                disabled={isVerifying}
                className="uppercase"
                autoFocus
                maxLength={50}
              />
            </div>
          </div>

          <Button
            onClick={handleVerifyCode}
            disabled={isVerifying || !inviteCode.trim()}
            className="w-full"
          >
            {isVerifying ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying code...
              </span>
            ) : "Continue"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Don't have an invite code?{" "}
            <a
              href="mailto:support@slabfy.com"
              className="font-semibold text-primary hover:text-primary/80"
            >
              Request access
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
