"use client";

import { useAuthStore } from "./auth-store";
import type { User } from "./types";

/**
 * The signed-in user.
 *
 * Reads straight from `useAuthStore`, so a profile edit via `patchUser()`
 * shows up everywhere immediately — the old version took the user as a prop
 * from a Server Component and could not change without a full reload.
 */

/** Throws if there is no session. Safe under `AuthGuard`, which guarantees one. */
export function useSession(): User {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    throw new Error(
      "useSession() requires a signed-in user. Render it inside <AuthGuard>, or use useOptionalSession().",
    );
  }

  return user;
}

/** For anything that renders on both sides of the sign-in boundary. */
export function useOptionalSession(): User | null {
  return useAuthStore((state) => state.user);
}

/** The corporates this account belongs to, and which one is active. */
export function useCorporateScope() {
  const corporates = useAuthStore((state) => state.corporates);
  const activeCorporateCode = useAuthStore((state) => state.activeCorporateCode);
  const setActiveCorporate = useAuthStore((state) => state.setActiveCorporate);

  return {
    corporates,
    activeCorporateCode,
    active: corporates.find((c) => c.corp_code === activeCorporateCode) ?? null,
    setActiveCorporate,
  };
}
