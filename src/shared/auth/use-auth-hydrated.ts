"use client";

import { useStoreHydrated } from "@/shared/hooks/use-store-hydrated";

import { useAuthStore } from "./auth-store";

/**
 * True once zustand has read the persisted session back out of localStorage.
 *
 * This matters more than it looks. On the first client render the store is
 * still at its initial state — `token: null` — even for a signed-in user.
 * Anything that redirects on "no token" without waiting for this will bounce
 * every single page load straight back to /login.
 */
export function useAuthHydrated(): boolean {
  return useStoreHydrated(useAuthStore);
}
