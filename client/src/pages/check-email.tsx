import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";

// Accept route props but don't use them
export default function CheckEmail(_props: any) {
  const [_, setLocation] = useLocation();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    // Get the stored email from localStorage
    const storedEmail = localStorage.getItem('slabfy_signup_email');
    if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const handleBackToSignIn = () => {
    setLocation("/signin");
  };

  const handleTrySignUp = () => {
    setLocation("/signup");
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
            We've sent a confirmation link to{" "}
            {email && <span className="font-medium text-foreground">{email}</span>}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Click the link in the email to activate your account. You may need to check your spam folder.
          </p>
        </div>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-4">
        <Button 
          onClick={handleBackToSignIn}
          className="w-full"
          variant="default"
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
            Didn't receive the email?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-semibold"
              onClick={handleTrySignUp}
            >
              Sign up again
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}