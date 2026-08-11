"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuthStore } from "./auth-store";
import { useAuthHydrated } from "./use-auth-hydrated";

/**
 * The only thing that can send a signed-in user back to /login.
 *
 * Two rules, and they are the point of this component:
 *
 *   1. **Never redirect before hydration.** `persist` reads localStorage after
 *      the first render, so a signed-in user looks signed-out for exactly one
 *      frame. Redirecting then bounces every page load.
 *   2. **Redirect only on a missing or expired token.** Not on a failed
 *      request, not on a slow `/me`, not on a network blip. A 401 from the API
 *      clears the store, which lands here as "no token" — that is the one
 *      automatic path out, plus the logout button.
 *
 * The previous version resolved the session on the server on every navigation
 * and redirected to logout whenever that call did not come back clean. That is
 * why login appeared to succeed and then fall back to the sign-in page.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const hydrated = useAuthHydrated();

  const hasToken = useAuthStore((state) => Boolean(state.token));
  const expiresAt = useAuthStore((state) => state.expiresAt);
  const clear = useAuthStore((state) => state.clear);

  // Expiry is checked here, not in the render body: `Date.now()` during render
  // is impure, and a component that reads the clock while rendering produces a
  // different tree every time React happens to re-run it.
  React.useEffect(() => {
    if (!hydrated || !hasToken) return;
    if (!expiresAt || expiresAt > Date.now()) return;

    // Lapsed. Dropping it flips `hasToken`, and the effect below redirects.
    clear();
  }, [hydrated, hasToken, expiresAt, clear]);

  React.useEffect(() => {
    if (!hydrated || hasToken) return;

    // The cookie can outlive the store — someone clears localStorage, or an
    // old cookie survives a logout that failed halfway. `proxy.ts` would then
    // see a session, wave the user back to /dashboard, and land here again:
    // an infinite redirect. Clearing first makes the cookie agree with the
    // store before we navigate.
    clear();

    // `?next=` only for somewhere the user would not land anyway. Sign-in
    // already goes to /dashboard, so `?next=/dashboard` is noise — and it is
    // what the logout button produces, since logout clears the store and this
    // effect fires before the navigation it triggered has committed.
    const { pathname, search } = window.location;
    const target = pathname + search;
    const worthKeeping =
      pathname !== "/" && pathname !== "/dashboard" && pathname !== "/login";

    router.replace(
      worthKeeping ? `/login?next=${encodeURIComponent(target)}` : "/login",
    );
  }, [hydrated, hasToken, clear, router]);

  // Waiting on localStorage, or the redirect above is already in flight.
  if (!hydrated || !hasToken) {
    return (
      <div
        role="status"
        aria-label="Loading"
        className="grid min-h-svh place-items-center bg-background"
      >
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
