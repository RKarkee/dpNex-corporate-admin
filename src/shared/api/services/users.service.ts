import { privateApiClient } from "@/shared/api/private-client";
import type { PageMeta } from "@/shared/api/types";
import type { User, YesNo } from "@/shared/auth/types";

/**
 * `/corporate/users` — the corporate-scoped user directory.
 *
 * `/admin/users` is the Super Admin portal's surface and is never called from
 * here. The corporate is implied by the `X-Corporate-Code` header the private
 * client attaches, so no request in this file passes a corporate id: the
 * endpoint cannot see outside the caller's own corporate.
 */

export interface UserListParams {
  page?: number;
  perPage?: number;
  signal?: AbortSignal;
}

export interface UserListResult {
  items: User[];
  meta?: PageMeta;
}

/** What the create form collects. `roles` is assigned separately — see below. */
export interface CreateUserInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  password_confirmation: string;
  user_type: string;
  disabled: YesNo;
  roles: number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Picks the user array out of whichever envelope this endpoint uses.
 *
 * The API's list endpoints disagree about where the array lives — `data.users`
 * for some, `data.data` for others, bare at the top level for a few. Taking
 * the first array we recognise costs one function and means a shape we did not
 * predict renders an empty table instead of throwing.
 */
function readUsers(raw: unknown): User[] {
  if (Array.isArray(raw)) return raw as User[];
  if (!isRecord(raw)) return [];

  if (Array.isArray(raw.users)) return raw.users as User[];

  const data = raw.data;
  if (Array.isArray(data)) return data as User[];
  if (isRecord(data)) {
    if (Array.isArray(data.users)) return data.users as User[];
    if (Array.isArray(data.data)) return data.data as User[];
  }

  return [];
}

export async function listUsers({
  page = 1,
  perPage = 15,
  signal,
}: UserListParams = {}): Promise<UserListResult> {
  const response = await privateApiClient.request<unknown>(
    "GET",
    "/corporate/users",
    undefined,
    {
      params: { page, per_page: perPage },
      // The table renders its own error card; the client's toast would double up.
      silent: true,
      signal,
    },
  );

  return { items: readUsers(response.raw), meta: response.meta };
}

/**
 * `POST /corporate/users`.
 *
 * Sent as `FormData` because the API takes multipart here, exactly as `/login`
 * does — a JSON body comes back 422. The client passes `FormData` through
 * untouched and leaves `Content-Type` unset so fetch can add the boundary.
 *
 * `corporate_id` is deliberately absent: the header already scopes the call,
 * and sending one would let a typo target another corporate.
 */
export async function createUser(input: CreateUserInput): Promise<User | null> {
  const form = new FormData();

  form.set("first_name", input.first_name);
  form.set("last_name", input.last_name);
  // The API keys the display name separately from the two parts.
  form.set("name", `${input.first_name} ${input.last_name}`.trim());
  form.set("email", input.email);
  form.set("password", input.password);
  form.set("password_confirmation", input.password_confirmation);
  form.set("user_type", input.user_type);
  form.set("disabled", input.disabled);

  if (input.phone?.trim()) form.set("phone", input.phone.trim());

  // Laravel reads repeated `roles[]` entries as an array. Harmless if the
  // endpoint ignores them — `assignRoles` is what actually persists roles.
  for (const roleId of input.roles) {
    form.append("roles[]", String(roleId));
  }

  const created = await privateApiClient.post<unknown>("/corporate/users", form, {
    // The form maps 422 field errors onto its own inputs.
    silent: true,
  });

  return readCreatedUser(created);
}

/** The created row, if the response carried one — the id is what `assignRoles` needs. */
function readCreatedUser(payload: unknown): User | null {
  if (!isRecord(payload)) return null;

  if (isRecord(payload.user)) return payload.user as unknown as User;
  if (isRecord(payload.users)) return payload.users as unknown as User;
  if (typeof payload.id === "number") return payload as unknown as User;

  return null;
}

/**
 * `POST /corporate/users/{id}/updateRoles`.
 *
 * Role assignment is its own endpoint here — unlike the Super Admin portal,
 * where roles ride along with the user payload.
 */
export async function assignRoles(
  userId: number,
  roleIds: number[],
): Promise<void> {
  const form = new FormData();
  for (const roleId of roleIds) form.append("roles[]", String(roleId));

  await privateApiClient.post(`/corporate/users/${userId}/updateRoles`, form, {
    silent: true,
  });
}
