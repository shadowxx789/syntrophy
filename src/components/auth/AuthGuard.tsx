"use client";

/**
 * AuthGuard Component
 * 凝序 Syntropy - Phase 5: User System
 *
 * Protects routes that require authentication
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore, useIsAuthenticated } from "@/stores/useAuthStore";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function AuthGuard({ children, fallback, redirectTo = "/auth/login" }: AuthGuardProps) {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const { isInitialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (isInitialized && !isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isInitialized, isLoading, isAuthenticated, router, redirectTo]);

  // Show loading state while initializing
  if (!isInitialized || isLoading) {
    return (
      fallback ?? (
        <div className="flex min-h-screen items-center justify-center bg-slate-900">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

/**
 * GuestGuard Component
 * Redirects authenticated users away from auth pages
 */
interface GuestGuardProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function GuestGuard({ children, redirectTo = "/" }: GuestGuardProps) {
  const router = useRouter();
  const isAuthenticated = useIsAuthenticated();
  const { isInitialized, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    if (!isInitialized) {
      initialize();
    }
  }, [isInitialized, initialize]);

  useEffect(() => {
    if (isInitialized && !isLoading && isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isInitialized, isLoading, isAuthenticated, router, redirectTo]);

  // Show loading state while initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  // Show nothing while redirecting
  if (isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
