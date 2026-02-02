/**
 * Auth State Management Store
 * 凝序 Syntropy - Phase 5: User System
 *
 * Manages user authentication state with Zustand
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import {
  getSupabaseClient,
  signIn as supabaseSignIn,
  signUp as supabaseSignUp,
  signOut as supabaseSignOut,
  resetPassword as supabaseResetPassword,
  isSupabaseConfigured,
} from "@/lib/supabaseClient";

export interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: AuthError | Error | null;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      // Initial state
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,
      error: null,

      /**
       * Initialize auth state from Supabase session
       * Should be called once on app load
       */
      initialize: async () => {
        // Skip if not configured
        if (!isSupabaseConfigured()) {
          set({ isInitialized: true, isLoading: false });
          return;
        }

        set({ isLoading: true });

        try {
          const supabase = getSupabaseClient();

          // Get current session
          const {
            data: { session },
          } = await supabase.auth.getSession();

          set({
            user: session?.user ?? null,
            session,
            isInitialized: true,
            isLoading: false,
            error: null,
          });

          // Listen for auth state changes
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              user: session?.user ?? null,
              session,
            });
          });
        } catch (error) {
          set({
            error: error as Error,
            isInitialized: true,
            isLoading: false,
          });
        }
      },

      /**
       * Sign in with email and password
       */
      signIn: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user, session } = await supabaseSignIn(email, password);

          set({
            user,
            session,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error as AuthError,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Sign up with email and password
       */
      signUp: async (email: string, password: string, displayName?: string) => {
        set({ isLoading: true, error: null });

        try {
          const { user, session } = await supabaseSignUp(email, password, displayName);

          set({
            user,
            session,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error as AuthError,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Sign out current user
       */
      signOut: async () => {
        set({ isLoading: true, error: null });

        try {
          await supabaseSignOut();

          set({
            user: null,
            session: null,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error as AuthError,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Send password reset email
       */
      resetPassword: async (email: string) => {
        set({ isLoading: true, error: null });

        try {
          await supabaseResetPassword(email);
          set({ isLoading: false, error: null });
        } catch (error) {
          set({
            error: error as AuthError,
            isLoading: false,
          });
          throw error;
        }
      },

      /**
       * Clear any auth errors
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "syntropy-auth",
      // Only persist minimal state (not sensitive data)
      partialize: (state) => ({
        isInitialized: state.isInitialized,
      }),
    }
  )
);

/**
 * Hook to check if user is authenticated
 */
export function useIsAuthenticated() {
  const user = useAuthStore((state) => state.user);
  return user !== null;
}

/**
 * Hook to get current user
 */
export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

/**
 * Hook to get auth loading state
 */
export function useAuthLoading() {
  return useAuthStore((state) => state.isLoading);
}
