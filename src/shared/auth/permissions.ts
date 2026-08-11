import type { PermissionMap, Role, User } from "./types";

/**
 * Decides what to *show*. Not access control — everything here runs in the
 * browser, so the API must enforce the same rules independently.
 *
 * The model, from the real `/me` payload:
 *
 *   "permissions": {
 *     "users":        ["view_user", "create_user", …],
 *     "consignments": ["view_consignment", "approve_consignment", …]
 *   }
 *
 * Permission names are whole and globally unique (`view_user`), so the group
 * is a UI label, not part of the identifier. That is why the primary lookup
 * is flat: `can(user, "view_user")`. Use `canInGroup()` only if the backend
 * ever reuses a name across groups.
 */

/* -------------------------------------------------------------------------- */
/* Flat lookup                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Cached per user object.
 *
 * The store replaces the user object on every change, so a `WeakMap` keyed on
 * it invalidates itself for free and cannot leak — without this, flattening
 * ~70 permissions would run on every render of every guarded component.
 */
const setCache = new WeakMap<User, Set<string>>();

export function permissionSet(user: User | null): Set<string> {
  if (!user) return new Set();

  const cached = setCache.get(user);
  if (cached) return cached;

  const flat = new Set<string>();
  for (const names of Object.values(user.permissions ?? {})) {
    for (const name of names ?? []) flat.add(name);
  }

  setCache.set(user, flat);
  return flat;
}

/**
 * True when the account carries no permission data at all.
 *
 * `POST /login` does not return `permissions`; `GET /me` does. Between the two
 * the map is missing entirely. That is *unknown*, not *denied*.
 */
export function hasNoPermissionData(user: User | null): boolean {
  if (!user) return true;
  return permissionSet(user).size === 0;
}

/**
 * **Fails open when there is no permission data.**
 *
 * Treating "not loaded yet" as "denied" collapses the sidebar to a single link
 * and redirects every guarded page — the app looks broken for a user whose
 * permissions simply have not arrived. Since this only decides what to
 * *render*, showing a control the API later refuses is recoverable; hiding the
 * whole app is not. Once a real map is present, matching is exact.
 */
export function can(user: User | null, permission: string): boolean {
  if (!user) return false;

  const granted = permissionSet(user);
  if (granted.size === 0) return true; // unknown, not denied

  return granted.has(permission);
}

export function canAny(user: User | null, permissions: string[]): boolean {
  if (permissions.length === 0) return true;
  return permissions.some((permission) => can(user, permission));
}

export function canAll(user: User | null, permissions: string[]): boolean {
  return permissions.every((permission) => can(user, permission));
}

/** Group-scoped check, for the day a name is reused across groups. */
export function canInGroup(
  user: User | null,
  group: string,
  permission: string,
): boolean {
  if (!user) return false;
  if (hasNoPermissionData(user)) return true;
  return user.permissions?.[group]?.includes(permission) ?? false;
}

/** True if the user holds *any* permission in a group — "can see this section". */
export function canAccessGroup(user: User | null, group: string): boolean {
  if (!user) return false;
  if (hasNoPermissionData(user)) return true;
  return (user.permissions?.[group]?.length ?? 0) > 0;
}

/** Kept so existing call sites (nav filtering, page guards) keep working. */
export const hasPermission = can;
export const hasAnyPermission = canAny;
export const hasAllPermissions = canAll;

/* -------------------------------------------------------------------------- */
/* Roles                                                                      */
/* -------------------------------------------------------------------------- */

export function hasRole(user: User | null, roleName: string): boolean {
  return (user?.roles ?? []).some((role) => role.name === roleName);
}

/** Matches the seeded corporate-admin role, whatever numeric prefix it carries. */
export function isCorporateAdmin(user: User | null): boolean {
  return (user?.roles ?? []).some((role) =>
    role.name.endsWith("default_corporate_admin"),
  );
}

/* -------------------------------------------------------------------------- */
/* Normalisation                                                              */
/* -------------------------------------------------------------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Pulls a permission name out of a string or a `{ name }` object. */
function readName(entry: unknown): string | null {
  if (typeof entry === "string") return entry.trim() || null;
  if (isRecord(entry) && typeof entry.name === "string") {
    return entry.name.trim() || null;
  }
  return null;
}

/**
 * Coerces whatever arrived into `{ group: string[] }`.
 *
 * `/me` already sends that shape, but roles nest permission *objects* under
 * the same key, and a flat array is a plausible third form. All three are
 * accepted so a backend tweak does not silently empty the sidebar.
 */
export function normalizePermissions(value: unknown): PermissionMap | undefined {
  if (!value) return undefined;

  // A flat list — group them under a single bucket, since `can()` is flat anyway.
  if (Array.isArray(value)) {
    const names = value.map(readName).filter((n): n is string => n !== null);
    return names.length ? { all: names } : undefined;
  }

  if (!isRecord(value)) return undefined;

  const map: PermissionMap = {};

  for (const [group, entries] of Object.entries(value)) {
    if (!Array.isArray(entries)) continue;

    const names = entries.map(readName).filter((n): n is string => n !== null);
    if (names.length) map[group] = names;
  }

  return Object.keys(map).length ? map : undefined;
}

/**
 * The union of every role's permissions.
 *
 * A fallback for accounts where `data.permissions` is absent but the roles
 * carry the detail — which is exactly what a multi-role user looks like when
 * the backend forgets to flatten.
 */
export function permissionsFromRoles(
  roles: Role[] | undefined,
): PermissionMap | undefined {
  if (!roles?.length) return undefined;

  const map: Record<string, Set<string>> = {};

  for (const role of roles) {
    for (const [group, entries] of Object.entries(role.permissions ?? {})) {
      for (const entry of entries ?? []) {
        const name = readName(entry);
        if (name) (map[group] ??= new Set()).add(name);
      }
    }
  }

  const result: PermissionMap = {};
  for (const [group, names] of Object.entries(map)) {
    result[group] = [...names];
  }

  return Object.keys(result).length ? result : undefined;
}
