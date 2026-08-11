import type { Permissions, User } from "./types";

/**
 * Decides what to *show*. Not access control — only the API can refuse an
 * operation, and it must, because everything here runs in the browser.
 */

/**
 * True when the account carries no permission map at all.
 *
 * `POST /login` does not return `permissions`; `GET /me` does. Between the two
 * — and for any account the backend has not assigned a role to yet — the map
 * is missing entirely. That is *unknown*, not *denied*.
 */
export function hasNoPermissionData(user: User | null): boolean {
  if (!user) return true;
  const map = user.permissions;
  return !map || Object.keys(map).length === 0;
}

/**
 * `permission` is `"module.action"`, split on the first dot only.
 *
 * **Fails open when the map is missing.** Treating "no data" as "no access"
 * collapses the sidebar to a single Dashboard link and makes every guarded
 * page redirect — the app looks broken for a user whose permissions simply
 * have not arrived. Since this only decides what to *render*, showing a link
 * the API later refuses is a recoverable error; hiding the entire app is not.
 *
 * Once a real map is present, filtering is strict.
 */
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;
  if (hasNoPermissionData(user)) return true;

  const dot = permission.indexOf(".");
  if (dot < 1 || dot === permission.length - 1) return false;

  const moduleName = permission.slice(0, dot);
  const action = permission.slice(dot + 1);

  const granted = user.permissions?.[moduleName];
  if (!granted) return false;

  // Some backends grant a wildcard rather than listing every action.
  return granted.includes(action) || granted.includes("*");
}

export function hasAnyPermission(
  user: User | null,
  permissions: string[],
): boolean {
  return permissions.some((permission) => hasPermission(user, permission));
}

export function hasAllPermissions(
  user: User | null,
  permissions: string[],
): boolean {
  return permissions.every((permission) => hasPermission(user, permission));
}

/** Normalises whatever `/me` returned into the `{ module: [action] }` shape. */
export function normalizePermissions(value: unknown): Permissions | undefined {
  if (typeof value !== "object" || value === null) return undefined;

  // Already keyed by module.
  if (!Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>).flatMap(
      ([module, actions]) =>
        Array.isArray(actions)
          ? [[module, actions.filter((a): a is string => typeof a === "string")] as const]
          : [],
    );
    return entries.length ? Object.fromEntries(entries) : undefined;
  }

  // A flat list — `["users.view", "users.create"]` — folded into the map.
  const map: Record<string, string[]> = {};

  for (const entry of value) {
    const name =
      typeof entry === "string"
        ? entry
        : typeof entry === "object" && entry !== null && "name" in entry &&
            typeof (entry as { name: unknown }).name === "string"
          ? (entry as { name: string }).name
          : null;

    if (!name) continue;

    const dot = name.indexOf(".");
    if (dot < 1) continue;

    const moduleName = name.slice(0, dot);
    const action = name.slice(dot + 1);
    (map[moduleName] ??= []).push(action);
  }

  return Object.keys(map).length ? map : undefined;
}
