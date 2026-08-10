import * as React from "react";
import { redirect } from "next/navigation";

import { getServerUser } from "@/shared/auth/session";

import { ProtectedLayout } from "./_components/protected-layout";

export default async function ProtectedGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerUser();

  // Via the logout handler, not straight to /login: a Server Component cannot
  // clear a cookie, and a stale one would bounce the user back here forever.
  if (!user) redirect("/api/auth/logout?expired=1");

  return <ProtectedLayout user={user}>{children}</ProtectedLayout>;
}
