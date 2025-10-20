import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useAuth } from "@/components/auth-provider";
import { usePageTitle } from "@/hooks/use-page-title";
import { Logo } from "@/components/logo";
import { Link } from "wouter";
import { GoogleSignInButton } from "@/components/ui/google-sign-in-button";
import { useToast } from "@/hooks/use-toast";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const signInSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type SignInFormValues = z.infer<typeof signInSchema>;

export default function SignIn() {
  usePageTitle('Sign In');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { signIn, user, resetPassword } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  const onSubmit = async (data: SignInFormValues) => {
    setIsSubmitting(true);
    try {
      await signIn(data.email, data.password);
      setLocation("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues("email");
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }
    
    await resetPassword(email);
    setShowForgotPassword(false);
  };

  return (
    <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-background text-foreground">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <Logo />
        <h2 className="mt-6 text-center text-2xl font-bold font-heading leading-9 tracking-tight text-foreground">
          Sign in to your account
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        {/* Google Sign In Button */}
        <div className="mb-6">
          <GoogleSignInButton />
        </div>
        
        {/* Or Separator */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">or</span>
          </div>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <div className="text-sm">
                      <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto font-semibold"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                      >
                        Forgot password?
                      </Button>
                    </div>
                  </div>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {showForgotPassword && (
              <div className="p-4 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground mb-3">
                  Enter your email above and click the button below to receive a password reset link.
                </p>
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleForgotPassword}
                >
                  Send Reset Email
                </Button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Form>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/signup" className="font-semibold leading-6 text-primary hover:text-primary/80">
            Create one
          </Link>
        </p>
      </div>
  </div>
  );
}
