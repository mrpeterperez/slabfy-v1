// 🤖 INTERNAL NOTE (LLM):
// This file defines the SignUp component for user registration.
// It handles new user creation and existing account detection.
// Part of the `auth` feature.
// Depends on `@/components/auth-provider`, `@/hooks/use-toast`, and `@/lib/supabase`.

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";

import { useAuth } from "@/components/auth-provider";
import { usePageTitle } from "@/hooks/use-page-title";
import type { SignUpResult } from "@/components/auth-provider";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Logo } from "@/components/logo";
import { GoogleSignInButton } from "@/components/ui/google-sign-in-button";
import { InviteGate } from "@/features/invite-system";

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

const signUpSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export default function SignUp() {
  usePageTitle('Sign Up');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteValidated, setInviteValidated] = useState(false);
  const { signUp, user } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    // If already signed in, redirect to dashboard
    if (user) {
      // Check localStorage to see if we're in the middle of signup process
      const isSigningUp = localStorage.getItem('slabfy_signing_up');
      
      if (isSigningUp === 'true') {
        // Clear the signup flag
        localStorage.removeItem('slabfy_signing_up');
        // Redirect to onboarding
        setLocation("/onboarding/step1");
      } else {
        // Regular login, go to dashboard
        setLocation("/dashboard");
      }
    }
  }, [user, setLocation]);

  /**
   * Handle form submission for user registration
   */
  const onSubmit = async (data: SignUpFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Set a flag in localStorage to mark signup process
      localStorage.setItem('slabfy_signing_up', 'true');
      localStorage.setItem('slabfy_signup_email', data.email);
      
      const result: SignUpResult = await signUp(data.email, data.password, "/onboarding/step1");

      if (result.status === 'success') {
        // 🔒 SECURITY: Mark invite code as used after successful signup
        const inviteCode = sessionStorage.getItem('slabfy_invite_code');
        if (inviteCode && result.userId) {
          try {
            await fetch('/api/invite-codes/use', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: inviteCode }),
            });
            // Clear invite code from session after use
            sessionStorage.removeItem('slabfy_invite_code');
          } catch (err) {
            console.error('Failed to mark invite code as used:', err);
            // Non-critical error, don't block signup flow
          }
        }
        
        setLocation("/check-email");
      } else if (result.status === 'exists') {
        // Clear signup flow since user should sign in instead
        localStorage.removeItem('slabfy_signing_up');
        localStorage.removeItem('slabfy_signup_email');
        // Navigate to sign in page after slight delay to let toast show
        setTimeout(() => setLocation('/signin'), 600);
      } else if (result.status === 'error') {
        // Inline password complexity handling
        if (result.message && result.message.toLowerCase().includes('password')) {
          form.setError('password', { message: result.message });
        } else {
          // Generic top-level toast already shown by auth provider for unexpected errors if any
          form.setError('password', { message: result.message || 'Sign up failed' });
        }
        // Cleanup signup flag on failure
        localStorage.removeItem('slabfy_signing_up');
        localStorage.removeItem('slabfy_signup_email');
      }
      
    } catch (error) {
      console.error("Error during signup:", error);
      
      // Clean up and ensure flag is removed on error
      localStorage.removeItem('slabfy_signing_up');
      localStorage.removeItem('slabfy_signup_email');
      
      // We only need to handle errors not already caught by the auth provider
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Don't show duplicate errors for existing accounts
      // Prefer inline password message if relevant
      if (errorMessage.toLowerCase().includes('password')) {
        form.setError('password', { message: errorMessage });
      } else {
        if (!errorMessage.includes("ACCOUNT_EXISTS") && 
            !errorMessage.includes("already registered") && 
            !errorMessage.includes("already exists")) {
          toast({
            title: "Sign up failed",
            description: errorMessage,
            variant: "destructive",
          });
        }
      }
      
      // Don't redirect to check-email if there was an error
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <InviteGate onValidCode={() => setInviteValidated(true)}>
      {inviteValidated ? (
        <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-background text-foreground">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <Logo />
            <h2 className="mt-6 text-center text-2xl font-bold font-heading leading-9 tracking-tight text-foreground">
              Create your Slabfy account
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            {/* Google Sign In Button */}
            <div className="mb-6">
              <GoogleSignInButton>Continue with Google</GoogleSignInButton>
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
                      <FormLabel>Password</FormLabel>
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing up..." : "Sign up"}
                </Button>
              </form>
            </Form>

            <p className="mt-10 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/signin" className="font-semibold leading-6 text-primary hover:text-primary/80">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      ) : null}
    </InviteGate>
  );
}