/** The API's actual shapes, not idealised ones. */

/** `Y`/`N` flags, as the API spells booleans. */
export type YesNo = "Y" | "N";

/* -------------------------------------------------------------------------- */
/* Permissions                                                                */
/* -------------------------------------------------------------------------- */

/**
 * `group_name` → permission names.
 *
 *   { users: ["view_user", "create_user"], consignments: ["view_consignment"] }
 *
 * Note what this is *not*: the names are whole permissions
 * (`view_user`), not `action` halves of a `module.action` string. The group is
 * a label for the UI, not part of the identifier — `view_user` is unique on its
 * own, which is why `can()` looks names up flat.
 */
export type PermissionMap = Record<string, string[] | undefined>;

/** A permission as it appears nested inside a role. */
export interface RolePermission {
  id: number;
  name: string;
  guard_name?: string;
  group_name?: string;
  /** Human-readable — `"view user"`. */
  label?: string;
}

/**
 * An account can hold several roles, or one, or none — the array length is not
 * something to rely on.
 */
export interface Role {
  id: number;
  /** The machine name, e.g. `1_default_corporate_admin`. */
  name: string;
  scope: "global" | "corporate" | (string & {});
  /** The corporate id this role is scoped to. `corporate`, not `corporate_id`. */
  corporate?: number | null;
  /** The display name — `"Corporate Admin"`. Prefer this over `name` in UI. */
  label?: string;
  /** Grouped permission objects. The flat `user.permissions` map is the union. */
  permissions?: Record<string, RolePermission[] | undefined>;
}

/** A role's display name, falling back to the machine name. */
export function roleLabel(role: Role): string {
  return role.label?.trim() || role.name;
}

/* -------------------------------------------------------------------------- */
/* Corporate                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The company scope.
 *
 * Two endpoints return this at two different fidelities: `POST /login` gives
 * an array of `{ corp_code, name }`, `GET /me` gives one fully populated
 * object under `corporate` (singular). Everything past the first two fields is
 * therefore optional.
 *
 * `corp_code` is the value `X-Corporate-Code` wants — `ABCDEF`, never the
 * numeric `id`.
 */
export interface Corporate {
  corp_code: string;
  name: string;
  id?: number;
  customer_id?: number;
  slug?: string | null;
  registered_name?: string | null;
  registration_number?: string | null;
  pan?: string | null;
  vat?: string | null;
  status?: string | null;
  kyc_status?: "APPROVED" | "PENDING" | "REJECTED" | (string & {});
  kyc_status_changed_at?: string | null;
  con_person_name?: string | null;
  con_person_designation?: string | null;
  con_person_email?: string | null;
  con_person_phone?: string | null;
  credit_limit?: string | null;
  used_limit?: string | null;
  advance_balance?: string | null;
  credit_days?: number | null;
  block_on_overdue?: YesNo;
  interest_rate?: string | null;
  default_currency?: string | null;
  have_custom_rates?: YesNo;
  created_at?: string | null;
  updated_at?: string | null;
}

/* -------------------------------------------------------------------------- */
/* User                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * The signed-in user.
 *
 * A union of two payloads, which is why so much is optional:
 *   `POST /login` → `first_name`, `last_name`, `disabled`, `allow_login`, `phone`
 *   `GET /me`     → `corporate`, `roles`, `permissions`
 *
 * Neither returns everything, and the store holds the merge of both.
 */
export interface User {
  id: number;
  name: string | null;
  first_name?: string | null;
  last_name?: string | null;
  slug?: string | null;
  email: string;
  phone?: string | null;

  /** `CRP` is the corporate user type this portal is built for. */
  user_type: "INT" | "EXT" | "CRP" | "ADM" | (string & {});

  /** Login only. `/me` omits these, so never treat absence as `"Y"`. */
  disabled?: YesNo;
  allow_login?: YesNo;

  /** `/me` only — the full company record. */
  corporate?: Corporate | null;
  corporate_id?: number | string | null;

  /** `/me` only. */
  roles?: Role[];
  permissions?: PermissionMap;

  email_verified_at?: string | null;
  last_login_at?: string | null;
  image?: string | null;
  image_thumbnail?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** The `data` block of `POST /login`. */
export interface LoginResponseData {
  token: string;
  user: User;
  corporates?: Corporate[];
}

/** The normalised login response. Hydrates `useAuthStore`. */
export interface LoginSession {
  token: string;
  user: User;
  corporates: Corporate[];
  activeCorporateCode: string | null;
}

/** Lets the UI react to *why* a sign-in failed, not just that it did. */
export type LoginFailureCode =
  | "invalid_credentials"
  | "not_corporate_user"
  | "account_disabled"
  | "no_corporate"
  | "unavailable";

/* -------------------------------------------------------------------------- */
/* Gates                                                                      */
/* -------------------------------------------------------------------------- */

/** The portal is corporate-only; every other user type belongs elsewhere. */
export const REQUIRED_USER_TYPE = "CRP";

export function isCorporateUser(user: Pick<User, "user_type">): boolean {
  return user.user_type === REQUIRED_USER_TYPE;
}

/**
 * Only `"Y"` disables and only `"N"` blocks login. `undefined` means the
 * endpoint did not report it — `/me` does not — and must read as allowed, or
 * every session refresh would sign the user out.
 */
export function isDisabled(user: Pick<User, "disabled" | "allow_login">): boolean {
  return user.disabled === "Y" || user.allow_login === "N";
}

/* -------------------------------------------------------------------------- */
/* Display                                                                    */
/* -------------------------------------------------------------------------- */

/** A name safe to render — the API leaves `name` null when only first/last are set. */
export function displayName(user: User): string {
  if (user.name?.trim()) return user.name.trim();

  const full = [user.first_name, user.last_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .trim();

  return full || user.email;
}

/** Two letters for the avatar fallback. */
export function initials(user: User): string {
  const source = displayName(user);
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}
