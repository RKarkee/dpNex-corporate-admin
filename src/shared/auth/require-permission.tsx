"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { hasPermission } from "./permissions";
import { useOptionalSession } from "./session-context";

/**
 * Page-level permission gate. Wrap a page's content:
 *
 *   <RequirePermission permission="users.view">
 *     …
 *   </RequirePermission>
 *
 * This covers a typed URL, which a hidden nav link does not. It is still only
 * a *display* decision — the API is what actually refuses an operation.
 *
 * Renders nothing rather than a "denied" screen: reaching here means the user
 * followed a link they should never have been shown, and a bare redirect to
 * the dashboard is less alarming than an error page.
 */
export function RequirePermission({
  permission,
  children,
  fallback = null,
}: {
  permission: string;
  children: React.ReactNode;
  /** Shown instead of redirecting, when a section should degrade in place. */
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const user = useOptionalSession();
  const allowed = hasPermission(user, permission);

  // `user === null` means AuthGuard has not settled yet — wait, do not bounce.
  const settled = user !== null;

  React.useEffect(() => {
    if (!settled || allowed || fallback !== null) return;
    router.replace("/dashboard");
  }, [settled, allowed, fallback, router]);

  if (!settled) return null;
  if (!allowed) return <>{fallback}</>;

  return <>{children}</>;
}
