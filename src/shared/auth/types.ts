/** The API's actual shapes, not idealised ones. */

export interface RolePivot {
  model_type: string;
  model_id: number;
  role_id: number;
  corporate_id: number | null;
}

export interface Role {
  id: number;
  name: string;
  scope: "global" | "corporate" | (string & {});
  corporate_id: number | null;
  pivot?: RolePivot;
}

/** Module name → granted actions, e.g. `{ users: ["view", "create"] }`. */
export type Permissions = Record<string, string[] | undefined>;

/**
 * As returned in `data.corporates` at login.
 *
 * `corp_code` is the value the API wants in `X-Corporate-Code` — a short code
 * like `ABCDEF`, *not* the numeric `corporate_id` on the user record.
 */
export interface Corporate {
  corp_code: string;
  name: string;
  id?: number;
}

/** `Y` means the account is switched off; every gate must refuse it. */
export type YesNo = "Y" | "N";

export interface User {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  slug?: string | null;
  email: string;
  phone?: string | null;
  disabled: YesNo;
  allow_login?: YesNo;
  /** `CRP` is the corporate user type this portal is built for. */
  user_type: "INT" | "EXT" | "CRP" | "ADM" | (string & {});
  corporate_id?: number | string | null;
  email_verified_at?: string | null;
  last_login_at?: string | null;
  roles?: Role[];
  permissions?: Permissions;
  image?: string | null;
  image_thumbnail?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** The `data` block of `POST /login`, exactly as the API returns it. */
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

/** The portal is corporate-only; every other user type belongs elsewhere. */
export const REQUIRED_USER_TYPE = "CRP";

export function isCorporateUser(user: Pick<User, "user_type">): boolean {
  return user.user_type === REQUIRED_USER_TYPE;
}

export function isDisabled(user: Pick<User, "disabled" | "allow_login">): boolean {
  return user.disabled === "Y" || user.allow_login === "N";
}

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
