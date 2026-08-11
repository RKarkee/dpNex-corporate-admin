import * as React from "react";

import { ProtectedLayout } from "./_components/protected-layout";

/**
 * No server-side session check.
 *
 * The token lives in the browser, so a `GET /me` here would be a second,
 * redundant round trip that fails independently of the real one — and any
 * failure redirected to /login, which is what bounced signed-in users back to
 * the sign-in page. `AuthGuard` inside `ProtectedLayout` owns the decision now.
 */
export default function ProtectedGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedLayout>{children}</ProtectedLayout>;
}
