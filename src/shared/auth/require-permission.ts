import { redirect } from "next/navigation";

import { hasPermission } from "./permissions";
import { getServerUser } from "./session";
import type { User } from "./types";

/** Page guard for Server Components — covers a typed URL, which a hidden nav link does not. */
export async function requirePermission(permission: string): Promise<User> {
  const user = await getServerUser();

  if (!user) redirect("/api/auth/logout?expired=1");
  if (!hasPermission(user, permission)) redirect("/dashboard");

  return user;
}
