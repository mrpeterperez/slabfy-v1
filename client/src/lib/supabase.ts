import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { apiRequest } from './queryClient';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase credentials missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Expose supabase globally for auth token helpers in queryClient
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
}

export type AuthFormData = {
  email: string;
  password: string;
};

export type User = {
  id: string;
  email?: string;
  username?: string;
  name?: string;
  bio?: string;
  avatarUrl?: string;
  collections?: string[];
  onboardingComplete?: string;
  createdAt?: string;
};

// API Authentication helpers
export const api = {
  auth: {
    register: async (email: string, password: string): Promise<User> => {
      const response = await apiRequest('POST', '/api/auth/register', { email, password });
      const user = await response.json();
      // Store user in localStorage for session persistence
      localStorage.setItem('slabfy_user', JSON.stringify(user));
      return user;
    },
    login: async (email: string, password: string): Promise<User> => {
      const response = await apiRequest('POST', '/api/auth/login', { email, password });
      const user = await response.json();
      // Store user in localStorage for session persistence
      localStorage.setItem('slabfy_user', JSON.stringify(user));
      return user;
    },
    logout: () => {
      // Remove user from localStorage
      localStorage.removeItem('slabfy_user');
    },
    getCurrentUser: (): User | null => {
      const userJson = localStorage.getItem('slabfy_user');
      if (userJson) {
        try {
          return JSON.parse(userJson);
        } catch (e) {
          return null;
        }
      }
      return null;
    },
    // Updates the current user in localStorage
    updateCurrentUser: (user: User) => {
      localStorage.setItem('slabfy_user', JSON.stringify(user));
    },
    // Create a user in our database (ensures sync between Supabase and our DB)
    createUserInDatabase: async (userId: string, email: string): Promise<User> => {
      const response = await apiRequest('POST', '/api/auth/sync', { id: userId, email });
      return await response.json();
    }
  },
  onboarding: {
    // Save user collections
    saveCollections: async (userId: string, collections: string[]): Promise<User> => {
      const response = await apiRequest('POST', `/api/user/${userId}/collections`, { collections });
      const user = await response.json();
      // Update user in localStorage
      const currentUser = api.auth.getCurrentUser();
      if (currentUser) {
        api.auth.updateCurrentUser({ ...currentUser, ...user });
      }
      return user;
    },
    // Mark onboarding as complete
    completeOnboarding: async (userId: string): Promise<User> => {
      const response = await apiRequest('POST', `/api/user/${userId}/onboarding`, { completed: true });
      const user = await response.json();
      // Update user in localStorage
      const currentUser = api.auth.getCurrentUser();
      if (currentUser) {
        api.auth.updateCurrentUser({ ...currentUser, ...user });
      }
      return user;
    }
  },
  profile: {
    // Get user data by ID
    getUserById: async (userId: string): Promise<User> => {
      const response = await apiRequest('GET', `/api/user/${userId}`);
      const user = await response.json();
      // Update user in localStorage
      const currentUser = api.auth.getCurrentUser();
      if (currentUser) {
        api.auth.updateCurrentUser({ ...currentUser, ...user });
      }
      return user;
    },
    // Update user profile
    updateProfile: async (userId: string, profile: { name?: string; bio?: string; avatarUrl?: string }): Promise<User> => {
      const response = await apiRequest('PUT', `/api/user/${userId}/profile`, profile);
      const user = await response.json();
      // Update user in localStorage
      const currentUser = api.auth.getCurrentUser();
      if (currentUser) {
        api.auth.updateCurrentUser({ ...currentUser, ...user });
      }
      return user;
    },
    // Upload avatar through backend API
    uploadAvatar: async (userId: string, file: File): Promise<User> => {
      console.log(`Starting avatar upload for user ${userId}, file size: ${Math.round(file.size / 1024)}KB`);
      
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('avatar', file);

      console.log('Sending avatar upload request...');

      // Include Supabase access token for server auth
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      // Use fetch directly for FormData (apiRequest is for JSON)
      const response = await fetch(`/api/user/${userId}/avatar`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(errorData.error || 'Failed to upload avatar');
      }

      const result = await response.json();
      console.log('Avatar upload completed successfully');
      
      // Return the result with avatar URL (profile is already updated on backend)
      return result;
    },
    // Delete avatar through backend API
    deleteAvatar: async (userId: string): Promise<void> => {
      await apiRequest('DELETE', `/api/user/${userId}/avatar`);
    }
  }
};
