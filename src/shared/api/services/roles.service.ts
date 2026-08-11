import { privateApiClient } from "@/shared/api/private-client";

/**
 * `GET /corporate/roles` — the roles assignable to a user in this corporate.
 *
 * Corporate-scoped by the `X-Corporate-Code` header the private client
 * attaches, so there is nothing to filter here: the endpoint cannot return a
 * role belonging to another corporate.
 */

/** What the selects render. Narrower than the API row on purpose. */
export interface RoleOption {
  id: number;
  label: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Picks the array out of whichever envelope this endpoint uses.
 *
 * The list endpoints are not consistent — some nest under `data.<resource>`,
 * some under `data.data`, some return the array at the top level. Rather than
 * bet on one, take the first array we recognise and let the caller show an
 * empty list if none is there.
 */
function readList(raw: unknown, key: string): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw[key])) return raw[key];

  const data = raw.data;
  if (Array.isArray(data)) return data;
  if (isRecord(data)) {
    if (Array.isArray(data[key])) return data[key];
    if (Array.isArray(data.data)) return data.data;
  }

  return [];
}

/**
 * `name` or `label`, whichever the API sends.
 *
 * The Super Admin portal's table reads `role.label` while its own type
 * declares `role.name`, so both spellings are in play. A role we cannot name
 * is dropped rather than rendered as "undefined".
 */
function toRoleOption(entry: unknown): RoleOption | null {
  if (!isRecord(entry)) return null;

  const id = typeof entry.id === "number" ? entry.id : Number(entry.id);
  if (!Number.isFinite(id)) return null;

  const label = [entry.label, entry.name, entry.display_name].find(
    (value): value is string => typeof value === "string" && value.trim() !== "",
  );
  if (!label) return null;

  return { id, label: label.trim() };
}

export async function listRoles(signal?: AbortSignal): Promise<RoleOption[]> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    "/corporate/roles",
    undefined,
    {
      // This endpoint paginates — it defaults to 10 per page — and the picker
      // shows every role at once. Without an explicit page size, a corporate
      // with more than ten roles would silently lose the rest.
      params: { per_page: 200 },
      // The form renders its own inline message for this, so the client's
      // automatic toast would be a duplicate.
      silent: true,
      retries: 1,
      signal,
    },
  );

  return readList(response.raw, "roles")
    .map(toRoleOption)
    .filter((role): role is RoleOption => role !== null);
}

/**
 * Query defaults. Roles change when an admin edits them, not during a form
 * fill, so this is fetched once per session rather than on every mount.
 */
export const rolesQuery = {
  queryKey: ["corporate-roles"] as const,
  queryFn: ({ signal }: { signal?: AbortSignal }) => listRoles(signal),
  staleTime: 10 * 60 * 1000,
} as const;
