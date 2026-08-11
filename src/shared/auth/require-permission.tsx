"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { canAny } from "./permissions";
import { useOptionalSession } from "./session-context";

/**
 * Page-level permission gate. Wrap a page's content:
 *
 *   <RequirePermission permission="view_user">…</RequirePermission>
 *   <RequirePermission anyOf={["approve_consignment", "view_any_consignment"]}>…</RequirePermission>
 *
 * Names are exactly what `/me` returns — `view_user`, not `users.view`.
 *
 * This covers a typed URL, which a hidden nav link does not. It is still only
 * a *display* decision — the API is what actually refuses an operation.
 *
 * Redirects rather than showing a "denied" screen: reaching here means the
 * user followed a link they should never have been shown, and landing back on
 * the dashboard is less alarming than an error page.
 */
export function RequirePermission({
  permission,
  anyOf,
  children,
  fallback = null,
}: {
  permission?: string;
  /** Any one of these is enough. Merged with `permission` if both are given. */
  anyOf?: string[];
  children: React.ReactNode;
  /** Rendered instead of redirecting, when a section should degrade in place. */
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const user = useOptionalSession();

  const required = React.useMemo(
    () => [...(permission ? [permission] : []), ...(anyOf ?? [])],
    [permission, anyOf],
  );

  const allowed = canAny(user, required);

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
