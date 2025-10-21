import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";
import { useAuth } from "@/components/auth-provider";

// Accept route props but don't use them
export default function CheckEmail(_props: any) {
  const [_, setLocation] = useLocation();
  const [email, setEmail] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const { resendConfirmationEmail } = useAuth();

  useEffect(() => {
    // Get the stored email from localStorage
    const storedEmail = localStorage.getItem('slabfy_signup_email');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  useEffect(() => {
    // Cooldown timer
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleBackToSignIn = () => {
    setLocation("/signin");
  };

  const handleTrySignUp = () => {
    setLocation("/signup");
  };

  const handleResendEmail = async () => {
    if (!email || cooldown > 0) return;
    
    await resendConfirmationEmail(email);
    setCooldown(60); // 60 second cooldown
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-background text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Logo />
        
        <div className="mt-6 text-center">
          <Mail className="mx-auto h-16 w-16 text-brand mb-4" />
          <h2 className="text-2xl font-bold font-heading leading-9 tracking-tight text-foreground">
            Check Your Email
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            {email && <span className="font-medium text-foreground">{email}</span>}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Click the link in your email to activate your account and get started.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Don't see it? Check your spam or junk folder.
          </p>
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-4">
        <Button 
          onClick={handleResendEmail}
          className="w-full"
          variant="default"
          disabled={cooldown > 0}
        >
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Confirmation Email"}
        </Button>
        
        <Button 
          onClick={handleBackToSignIn}
          className="w-full"
          variant="outline"
        >
          Back to Sign In
        </Button>
        
        <Button 
          onClick={handleTrySignUp}
          className="w-full"
          variant="outline"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Try Different Email
        </Button>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive the email? Check your spam folder or click resend above.
          </p>
        </div>
      </div>
    </div>
  );
}