import type { MutationResult } from "@/shared/api/http/create-client";
import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";
import type { Role, RolePermission } from "@/shared/auth/types";

/**
 * Corporate roles and permissions.
 *
 * Everything is corporate-scoped by `X-Corporate-Code`, which the client
 * attaches. That is why nothing here takes a corporate argument, and why the
 * create/update payload has no `scope` or `corporate` field — unlike the Super
 * Admin portal, where both are chosen in the form.
 */

/** `group_name` → the permissions in it, ready to render as a section. */
export type PermissionGroups = Record<string, RolePermission[] | undefined>;

export interface RoleListParams {
  page?: number;
  per_page?: number;
  search?: string;
}

export interface RoleListResult {
  items: Role[];
  meta: PageMeta | undefined;
}

/** The create and update bodies are identical. */
export interface RoleInput {
  label: string;
  /** Permission **ids**, not names — `[1, 2, 19]`. */
  permissions: number[];
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

/** `GET /corporate/permissions` → `data.permissions`, already grouped. */
export function fetchPermissionGroups(
  signal?: AbortSignal,
): Promise<PermissionGroups> {
  return privateApiClient.get<PermissionGroups>("/corporate/permissions", {
    unwrap: "permissions",
    signal,
  });
}

/** `GET /corporate/roles` → `data.roles`, with pagination in the top-level `meta`. */
export function fetchRoles(
  params: RoleListParams = {},
  signal?: AbortSignal,
): Promise<RoleListResult> {
  return privateApiClient.paginated<Role>("/corporate/roles", {
    unwrap: "roles",
    params: {
      page: params.page ?? 1,
      per_page: params.per_page ?? 10,
      search: params.search,
    },
    signal,
  });
}

/**
 * `GET /corporate/roles/{id}` → `data.roles`.
 *
 * Plural key, single object. Not a typo on our side — the API returns the
 * detail record under the same key as the list.
 */
export function fetchRole(id: number, signal?: AbortSignal): Promise<Role> {
  return privateApiClient.get<Role>(`/corporate/roles/${id}`, {
    unwrap: "roles",
    signal,
  });
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * `POST /corporate/roles`.
 *
 * `name`, `scope` and `corporate` are all derived server-side — the API builds
 * `name` as `{corporate_id}_{slug}` from the label. Sending them is at best
 * ignored.
 *
 * `mutate()` rather than `post()` so the caller gets the API's own success
 * message back for the toast. `silent` suppresses the interceptor's automatic
 * error toast — the mutation hook raises a better one, with field errors
 * already mapped onto the form.
 */
export function createRole(input: RoleInput): Promise<MutationResult> {
  return privateApiClient.mutate("POST", "/corporate/roles", input, {
    silent: true,
  });
}

/** `PUT /corporate/roles/{id}` — same body as create. */
export function updateRole(
  id: number,
  input: RoleInput,
): Promise<MutationResult> {
  return privateApiClient.mutate("PUT", `/corporate/roles/${id}`, input, {
    silent: true,
  });
}

/** `DELETE /corporate/roles/{id}`. */
export function deleteRole(id: number): Promise<MutationResult> {
  return privateApiClient.mutate("DELETE", `/corporate/roles/${id}`, undefined, {
    silent: true,
  });
}

/* -------------------------------------------------------------------------- */
/* Shaping helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Every permission across every group, flat. */
export function flattenPermissions(groups: PermissionGroups): RolePermission[] {
  return Object.values(groups).flatMap((entries) => entries ?? []);
}

/**
 * The permission ids a role currently holds.
 *
 * A role's `permissions` arrive grouped and as objects; the form works in ids
 * and the API expects ids, so this is the bridge on the way in.
 */
export function selectedPermissionIds(role: Role | undefined): Set<number> {
  const ids = new Set<number>();
  if (!role) return ids;

  for (const entries of Object.values(role.permissions ?? {})) {
    for (const permission of entries ?? []) ids.add(permission.id);
  }

  return ids;
}

/** Total count across groups — for the list's "N permissions" badge. */
export function countPermissions(role: Role): number {
  return Object.values(role.permissions ?? {}).reduce(
    (total, entries) => total + (entries?.length ?? 0),
    0,
  );
}

/** `view_any_consignment` → `view any consignment`, when the API sends no label. */
export function permissionLabel(permission: RolePermission): string {
  return permission.label?.trim() || permission.name.replace(/_/g, " ");
}

/** `master_data_setups` → `master data setups`. */
export function groupLabel(group: string): string {
  return group.replace(/_/g, " ");
}
