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

export interface Corporate {
  id: number;
  name?: string | null;
  code?: string | null;
}

export interface User {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  slug?: string | null;
  email: string;
  phone?: string | null;
  disabled: "Y" | "N";
  /** `CRP` is the corporate user type this portal is built for. */
  user_type: "INT" | "EXT" | "CRP" | "ADM" | (string & {});
  corporate_id?: number | string | null;
  corporates?: Corporate | Corporate[] | null;
  roles?: Role[];
  permissions?: Permissions;
  image?: string | null;
  image_thumbnail?: string | null;
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

/** What the login route returns to the browser. Never carries the token. */
export type LoginResult = { ok: true } | { ok: false; error: string };
