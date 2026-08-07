"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { routes } from "@/shared/config/site";

import { useAuthStore } from "./auth-store";

/**
 * Client-side gate for the (protected) route group.
 * Waits for the persisted store to rehydrate so a refresh does not bounce
 * an authenticated user back to /login.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const token = useAuthStore((s) => s.token);

  React.useEffect(() => {
    if (hydrated && !token) router.replace(routes.login);
  }, [hydrated, token, router]);

  if (!hydrated || !token) {
    return (
      <div className="grid min-h-svh place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="sr-only">Checking your session…</span>
      </div>
    );
  }

  return <>{children}</>;
}
