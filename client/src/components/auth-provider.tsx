// 🤖 INTERNAL NOTE (LLM):
// This file defines the AuthProvider component and useAuth hook.
// It wraps the application with authentication context and handles user login/signup flows.
// Part of the `auth` feature.
// Depends on `@/lib/supabase` and `@/hooks/use-toast`.

import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase, User, api } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface SignUpSuccess { status: 'success'; userId?: string }
interface SignUpExists { status: 'exists' }
interface SignUpError { status: 'error'; message: string; code?: string }
export type SignUpResult = SignUpSuccess | SignUpExists | SignUpError;

interface AuthContextProps {
  user: User | null;
  loading: boolean;
  // Returns structured result so caller can decide on navigation + field errors
  signUp: (email: string, password: string, redirectUrl?: string) => Promise<SignUpResult>;
  signIn: (email: string, password: string, redirectUrl?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

// Set this to false to use Supabase auth instead of our database auth
const USE_DATABASE_AUTH = false;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (USE_DATABASE_AUTH) {
      // For database auth, check localStorage for stored user
      const storedUser = api.auth.getCurrentUser();
      if (storedUser) {
        setUser(storedUser);
      }
      setLoading(false);
      return;
    }
    
    // Check for active session on mount with Supabase
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error fetching session:", error);
          setLoading(false);
          return;
        }
        
        if (data.session?.user) {
          const authUser = data.session.user;
          
          // Simple flow: fetch user from DB, if not found require invite code
          try {
            const response = await fetch(`/api/user/${authUser.id}`);
            if (response.ok) {
              setUser(await response.json());
            } else if (response.status === 404) {
              // User not in DB - try to sync with invite code
              const inviteCode = localStorage.getItem('slabfy_invite_code');
              
              if (!inviteCode) {
                console.warn("User not in DB and no invite code - signing out");
                await supabase.auth.signOut();
                toast({
                  title: "Account setup incomplete",
                  description: "Please sign up with an invite code.",
                  variant: "destructive",
                });
                return;
              }
              
              // Attempt sync
              const syncResponse = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: authUser.id,
                  email: authUser.email,
                  inviteCode,
                }),
              });
              
              if (syncResponse.ok) {
                setUser(await syncResponse.json());
                localStorage.removeItem('slabfy_invite_code');
              } else {
                console.error("Sync failed:", syncResponse.status);
                await supabase.auth.signOut();
                toast({
                  title: "Invalid invite code",
                  description: "Please check your invite code and try again.",
                  variant: "destructive",
                });
              }
            }
          } catch (error) {
            console.error("Error fetching user:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, !!session);
        
        if (session?.user) {
          const authUser = session.user;
          
          // Simple flow: fetch user from DB, if not found require invite code
          try {
            const response = await fetch(`/api/user/${authUser.id}`);
            if (response.ok) {
              setUser(await response.json());
            } else if (response.status === 404) {
              // User not in DB - try to sync with invite code
              const inviteCode = localStorage.getItem('slabfy_invite_code');
              
              if (!inviteCode) {
                console.warn("Auth change: User not in DB, no invite code");
                await supabase.auth.signOut();
                setUser(null);
                toast({
                  title: "Account setup incomplete",
                  description: "Please sign up with an invite code.",
                  variant: "destructive",
                });
                return;
              }
              
              // Attempt sync
              const syncResponse = await fetch('/api/auth/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: authUser.id,
                  email: authUser.email,
                  inviteCode,
                }),
              });
              
              if (syncResponse.ok) {
                setUser(await syncResponse.json());
                localStorage.removeItem('slabfy_invite_code');
                toast({
                  title: "Account created!",
                  description: "Welcome to Slabfy!",
                });
              } else {
                console.error("Auth change: Sync failed:", syncResponse.status);
                await supabase.auth.signOut();
                setUser(null);
                toast({
                  title: "Invalid invite code",
                  description: "Please check your invite code and try again.",
                  variant: "destructive",
                });
              }
            }
          } catch (error) {
            console.error("Auth change: Error fetching user:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Handle user registration with Supabase or database auth
   * @param email User's email address
   * @param password User's chosen password
   * @param redirectUrl Optional URL to redirect after signup
   */
  const signUp = async (email: string, password: string, redirectUrl?: string): Promise<SignUpResult> => {
    try {
      if (USE_DATABASE_AUTH) {
        // Use our database auth
        const user = await api.auth.register(email, password);
        setUser(user);
        toast({
          title: "Sign up successful",
          description: "Welcome to Slabfy!",
        });
        return { status: 'success', userId: user.id };
      }

      // Use Supabase auth
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`
        }
      });

  if (error) {
        console.log("Supabase signup error:", error);
        
        // Check for existing account errors
        // Supabase returns error code "user_already_exists" or message containing "already exists"
        const isExistingAccount = 
          error.code === "user_already_exists" || 
          (error.message && (
            error.message.includes("already exists") || 
            error.message.includes("already registered") ||
            error.message.includes("already in use")
          ));
        
        if (isExistingAccount) {
          toast({
            title: "Account already exists",
            description: "This email is already registered. Please use the sign in page instead.",
            variant: "default",
          });
          return { status: 'exists' };
        }
        // For password complexity & other errors we return structured result WITHOUT redirecting.
        return { status: 'error', message: error.message, code: error.code };
      }
      
      // Supabase specific: Check for "identities" array length to detect existing users
      // An identity length of 0 often means the user was found but not created
      if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
        toast({
          title: "Account already exists",
          description: "This email is already registered. Please use the sign in page instead.",
          variant: "default",
        });
        return { status: 'exists' };
      }

      // Since email confirmations are now enabled, user won't be signed in until they confirm
      if (data.user) {
        toast({
          title: "Please check your email",
          description: "We've sent you a confirmation link. Click it to activate your account.",
        });
        return { status: 'success', userId: data.user.id };
      }

      return { status: 'error', message: 'Unknown sign up state' };
    } catch (error) {
      console.error("Unexpected error during sign up:", error);
      toast({
        title: "An unexpected error occurred",
        description: "Please try again later.",
        variant: "destructive",
      });
      return { status: 'error', message: 'Unexpected error' };
    }
  };

  // Allow redirectUrl parameter to specify where to navigate after signin
  const signIn = async (email: string, password: string, redirectUrl?: string) => {
    try {
      if (USE_DATABASE_AUTH) {
        const user = await api.auth.login(email, password);
        setUser(user);
        toast({
          title: "Sign in successful",
          description: "Welcome back!",
        });
        return;
      }

      // Use Supabase auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        // Check for email not confirmed error - let the signin page handle the UI
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          throw error; // Throw so signin page can handle it with resend UI
        }
        
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      if (data.user) {
        // Simple: fetch user from DB
        const response = await fetch(`/api/user/${data.user.id}`);
        if (response.ok) {
          setUser(await response.json());
          toast({
            title: "Sign in successful",
            description: "Welcome back!",
          });
        } else if (response.status === 404) {
          // User not in DB - onAuthStateChange will handle sync
          console.log("User not in DB, auth state listener will sync");
        } else {
          console.error("Error fetching user:", response.status);
          setUser(null);
        }
      }
    } catch (error) {
      console.error("Sign in error:", error);
      // Re-throw for caller to handle
      throw error;
    }
  };

  /**
   * Sign in with Google OAuth
   */
  const signInWithGoogle = async () => {
    try {
      if (USE_DATABASE_AUTH) {
        toast({
          title: "OAuth not supported",
          description: "Google sign-in is only available with Supabase authentication.",
          variant: "destructive",
        });
        return;
      }

      // Use Supabase OAuth for Google
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect to OAuth callback which requires invite code for new users
          redirectTo: `${window.location.origin}/oauth-callback`,
        }
      });

      if (error) {
        console.error("Google OAuth error:", error);
        toast({
          title: "Google sign-in failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // The OAuth flow will redirect, so no immediate user setting needed
      // The auth state change listener will handle the user creation
    } catch (error) {
      console.error("Unexpected error during Google sign-in:", error);
      toast({
        title: "An unexpected error occurred",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  /**
   * Send password reset email
   */
  const resetPassword = async (email: string) => {
    try {
      if (USE_DATABASE_AUTH) {
        toast({
          title: "Password reset not supported",
          description: "Password reset is only available with Supabase authentication.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        toast({
          title: "Password reset failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Password reset email sent",
        description: "Check your email for instructions to reset your password.",
      });
    } catch (error) {
      console.error("Unexpected error during password reset:", error);
      toast({
        title: "An unexpected error occurred",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  /**
   * Resend confirmation email
   */
  const resendConfirmationEmail = async (email: string) => {
    try {
      if (USE_DATABASE_AUTH) {
        toast({
          title: "Resend not supported",
          description: "Email confirmation is only available with Supabase authentication.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/email-confirmed`
        }
      });

      if (error) {
        toast({
          title: "Resend failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Confirmation email sent",
        description: "Check your email inbox (and spam folder) for the confirmation link.",
      });
    } catch (error) {
      console.error("Unexpected error during email resend:", error);
      toast({
        title: "An unexpected error occurred",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const signOut = async () => {
    try {
      if (USE_DATABASE_AUTH) {
        // For database auth, remove user from storage and state
        api.auth.logout();
        setUser(null);
        toast({
          title: "Signed out successfully",
        });
        return;
      }
      
      // Use Supabase auth - sign out with local scope to avoid 403 errors
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      // Even if Supabase signOut fails (403), still clear local state
      if (error && error.status !== 403) {
        console.warn("Sign out API error (continuing anyway):", error);
      }
      
      // Always clear local state regardless of API response
      setUser(null);
      toast({
        title: "Signed out successfully",
      });
    } catch (error) {
      console.error("Unexpected error during sign out:", error);
      // Still clear local state even on error
      setUser(null);
      toast({
        title: "Signed out successfully",
      });
    }
  };

  const refreshUser = async (userId: string) => {
    try {
      // Use the API client to get the latest user data
      const updatedUser = await api.profile.getUserById(userId);
      
      if (updatedUser) {
        setUser(prevUser => ({
          ...prevUser,
          ...updatedUser
        }));
      }
    } catch (error) {
      console.error("Error refreshing user data:", error);
      toast({
        title: "Couldn't refresh user data",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    resendConfirmationEmail,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
