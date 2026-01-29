"use client";

import { usePathname } from "next/navigation";

import { AuthGuard } from "@/components/auth/AuthGuard";

export function AuthRouteGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Allow unauthenticated access to auth pages.
  if (pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  return <AuthGuard>{children}</AuthGuard>;
}
