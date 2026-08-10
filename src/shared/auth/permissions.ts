import type { User } from "./types";

/** Decides what to *show*. Not access control — only the API can refuse an operation. */

/** `permission` is `"module.action"`, split on the first dot only. */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;

  const dot = permission.indexOf(".");
  if (dot < 1 || dot === permission.length - 1) return false;

  const moduleName = permission.slice(0, dot);
  const action = permission.slice(dot + 1);

  return user.permissions?.[moduleName]?.includes(action) ?? false;
}

export function hasAnyPermission(
  user: User | null,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}
