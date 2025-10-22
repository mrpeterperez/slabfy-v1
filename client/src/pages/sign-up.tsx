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
  const [validatedInviteCode, setValidatedInviteCode] = useState<string>(() => {
    // Initialize from sessionStorage if available
    return sessionStorage.getItem("slabfy_invite_code") || "";
  });
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
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  /**
   * Handle form submission for user registration
   */
  const onSubmit = async (data: SignUpFormValues) => {
    setIsSubmitting(true);
    
    try {
      // Validate we have an invite code before proceeding
      if (!validatedInviteCode || validatedInviteCode.trim() === "") {
        toast({
          title: "Missing invite code",
          description: "Please refresh the page and enter your invite code again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      
      console.log("Signing up with invite code:", validatedInviteCode); // DEBUG
      
      // Pass invite code to signUp - it stores it in Supabase user_metadata!
      const result: SignUpResult = await signUp(data.email, data.password, validatedInviteCode, "/onboarding/step1");

      if (result.status === 'success') {
        // Invite code is stored in Supabase metadata - no localStorage needed!
        setLocation(`/check-email?email=${encodeURIComponent(data.email)}`);
      } else if (result.status === 'exists') {
        // Navigate to sign in page after slight delay to let toast show
        setTimeout(() => setLocation('/signin'), 600);
      } else if (result.status === 'error') {
        // Inline password complexity handling
        if (result.message && result.message.toLowerCase().includes('password')) {
          form.setError('password', { message: result.message });
        } else {
          form.setError('password', { message: result.message || 'Sign up failed' });
        }
      }
      
    } catch (error) {
      console.error("Error during signup:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
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
      
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <InviteGate onValidCode={(code) => {
      console.log("InviteGate validated code:", code); // DEBUG
      setValidatedInviteCode(code || "");
      setInviteValidated(true);
    }}>
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
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating account...
                    </span>
                  ) : "Sign up"}
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