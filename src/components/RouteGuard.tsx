"use client";

import { useAuth } from "@/hooks/useAuth";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  // Server-side route protection is handled by src/middleware.ts.
  // This provides a client-side loading spinner while auth state hydrates.
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-500" />
      </div>
    );
  }

  return <>{children}</>;
}


