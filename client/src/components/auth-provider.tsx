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
        
        if (data.session) {
          const { user } = data.session;
          
          // Fetch complete user data from our database first
          // DON'T set temporary user state to prevent dashboard access before sync
          try {
            const response = await fetch(`/api/user/${user.id}`);
            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
            } else if (response.status === 404) {
              // User doesn't exist in our database, check if this is a NEW user or an existing user
              console.log("User not found in database during session check, checking if this is a new signup...");
              
              // Check if user exists by email (they might have signed up with different OAuth provider)
              try {
                const emailCheckResponse = await fetch(`/api/user/by-email/${encodeURIComponent(user.email!)}`);
                
                if (emailCheckResponse.ok) {
                  // User exists with this email but different ID - link accounts
                  console.log("Found existing user with same email during session check, linking accounts...");
                  const existingUser = await emailCheckResponse.json();
                  setUser(existingUser);
                  return;
                } else if (emailCheckResponse.status === 404) {
                  // This is truly a new user - they need an invite code
                  console.log("New user detected during session check, requiring invite code...");
                  const inviteCode = localStorage.getItem('slabfy_invite_code');
                  
                  if (!inviteCode) {
                    // New user without invite code - redirect to signup with invite
                    console.warn("New user attempting session without invite code - redirecting to signup");
                    await supabase.auth.signOut();
                    setUser(null);
                    toast({
                      title: "Account not found",
                      description: "Please use an invite code to create a new account.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const syncResponse = await fetch('/api/auth/sync', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      id: user.id,
                      email: user.email,
                      inviteCode,
                    }),
                  });
                  
                  if (syncResponse.ok) {
                    const syncedUser = await syncResponse.json();
                    setUser(syncedUser);
                    console.log("New user synced successfully during session check:", syncedUser.id);
                    try { localStorage.removeItem('slabfy_invite_code'); } catch {}
                  } else if (syncResponse.status === 403) {
                    // Invalid invite code for new user
                    console.warn("Invalid invite code for new user during session check");
                    await supabase.auth.signOut();
                    setUser(null);
                    toast({
                      title: "Invalid invite code",
                      description: "Please check your invite code and try again.",
                      variant: "destructive",
                    });
                  } else {
                    console.error("Failed to sync new user during session check, status:", syncResponse.status);
                    setUser(null);
                  }
                } else {
                  console.error("Error checking user by email during session check, status:", emailCheckResponse.status);
                  setUser(null);
                }
              } catch (syncError) {
                console.error("Error during user sync process in session check:", syncError);
                setUser(null);
              }
            }
          } catch (error) {
            console.error("Error fetching user data on session check:", error);
            setUser(null);
          }
        } else {
          // No session found
          setUser(null);
        }
      } catch (error) {
        console.error("Unexpected error during session check:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event, !!session);
        
        if (session && session.user) {
          console.log("Auth state change: validating user:", session.user.email);
          
          // Reject fake emails immediately
          if (session.user.email && session.user.email.includes("@example.com")) {
            console.warn("Detected fake email, signing out:", session.user.email);
            await supabase.auth.signOut();
            setUser(null);
            return;
          }
          
          // Fetch complete user data from our database first
          // DON'T set temporary user state to prevent dashboard access before sync
          try {
            const response = await fetch(`/api/user/${session.user.id}`);
            if (response.ok) {
              const userData = await response.json();
              console.log("User found in database:", userData.email);
              setUser(userData);
            } else if (response.status === 404) {
              // User doesn't exist in our database, check if this is a NEW user or an existing user
              console.log("User not found in database, checking if this is a new signup...");
              
              // Check if user exists by email (they might have signed up with different OAuth provider)
              try {
                const emailCheckResponse = await fetch(`/api/user/by-email/${encodeURIComponent(session.user.email!)}`);
                
                if (emailCheckResponse.ok) {
                  // User exists with this email but different ID - link accounts
                  console.log("Found existing user with same email, linking accounts...");
                  const existingUser = await emailCheckResponse.json();
                  setUser(existingUser);
                  return;
                } else if (emailCheckResponse.status === 404) {
                  // This is truly a new user - they need an invite code
                  console.log("New user detected, requiring invite code...");
                  const inviteCode = localStorage.getItem('slabfy_invite_code');
                  console.log("Syncing with invite code:", !!inviteCode);
                  
                  if (!inviteCode) {
                    // New user without invite code - redirect to signup with invite
                    console.warn("New user attempting login without invite code - redirecting to signup");
                    await supabase.auth.signOut();
                    setUser(null);
                    toast({
                      title: "Account not found",
                      description: "Please use an invite code to create a new account.",
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  const syncResponse = await fetch('/api/auth/sync', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      id: session.user.id,
                      email: session.user.email,
                      inviteCode,
                    }),
                  });
                  
                  if (syncResponse.ok) {
                    const syncedUser = await syncResponse.json();
                    setUser(syncedUser);
                    console.log("New user synced successfully:", syncedUser.email);
                    try { localStorage.removeItem('slabfy_invite_code'); } catch {}
                  } else if (syncResponse.status === 403) {
                    // Invalid invite code for new user
                    console.warn("Invalid invite code for new user");
                    await supabase.auth.signOut();
                    setUser(null);
                    toast({
                      title: "Invalid invite code",
                      description: "Please check your invite code and try again.",
                      variant: "destructive",
                    });
                  } else {
                    console.error("Failed to sync new user, status:", syncResponse.status);
                    setUser(null);
                  }
                } else {
                  console.error("Error checking user by email, status:", emailCheckResponse.status);
                  setUser(null);
                }
              } catch (syncError) {
                console.error("Error during user sync process:", syncError);
                setUser(null);
              }
            }
          } catch (error) {
            console.error("Error fetching user data on auth state change:", error);
            setUser(null);
          }
        } else {
          console.log("Auth state change: no session");
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
        // Use our database auth
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
        if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
          throw error; // Throw so signin page can handle it with resend UI
        }
        
        // For other errors, show toast and throw
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive",
        });
        throw error;
      }

      if (data.user) {
        // Fetch complete user data from our database (don't set temp user state)
        try {
          const response = await fetch(`/api/user/${data.user.id}`);
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            toast({
              title: "Sign in successful",
              description: "Welcome back!",
            });
          } else {
            console.error("User not found in database during sign in");
            setUser(null);
          }
        } catch (fetchError) {
          console.error("Error fetching user data on sign in:", fetchError);
          setUser(null);
        }
      }
    } catch (error) {
      // Don't swallow errors here – let callers (e.g. SignIn page) render specific UI
      console.error("Unexpected error during sign in:", error);
      // Show a generic toast only for unknown errors; callers may still handle specifics
      if (!(error as any)?.message?.toLowerCase?.().includes?.('email not confirmed')) {
        toast({
          title: "An unexpected error occurred",
          description: "Please try again later.",
          variant: "destructive",
        });
      }
      // Re-throw so the caller can react (e.g., show resend panel)
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
