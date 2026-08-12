import { ApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
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
  disabled: YesNo;
  roles: number[];
  /** Optional profile photo. Omitted from the request when absent. */
  image?: File | null;
}

/**
 * What the edit form sends.
 *
 * Derived from `CreateUserInput` so the two cannot drift: an edit sets no
 * password (there is no verified endpoint for changing one from here) and no
 * roles, which `assignRoles` persists on its own endpoint.
 */
export type UpdateUserInput = Omit<
  CreateUserInput,
  "password" | "password_confirmation" | "roles"
>;

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
 * Picks the single user record out of whichever envelope the detail endpoint
 * uses.
 *
 * Same reasoning as `readUsers`, one record at a time: `/corporate/roles/{id}`
 * answers under the *plural* key, so the singular is not a safe assumption
 * here either. A numeric `id` is what distinguishes the record from the
 * wrapper around it.
 */
function readUser(raw: unknown): User | null {
  if (!isRecord(raw)) return null;

  const data = isRecord(raw.data) ? raw.data : undefined;
  const candidates = [
    raw.user,
    raw.users,
    data?.user,
    data?.users,
    data?.data,
    data,
    raw,
  ];

  for (const candidate of candidates) {
    if (isRecord(candidate) && typeof candidate.id === "number") {
      return candidate as unknown as User;
    }
  }

  return null;
}

/**
 * One user, for the detail and edit pages.
 *
 * `GET /corporate/users/{id}` — one request, and it carries everything both
 * pages need: the profile fields, `roles`, and each role's full `permissions`
 * map. Verified against a live response.
 *
 * The record sits at `data.users` — plural key, single object, the same quirk
 * `/corporate/roles/{id}` has. `readUser` looks there first.
 *
 * Throws when the id resolves to nothing, which the page turns into "User not
 * found" — the same answer a deleted id, a mistyped one, and another
 * corporate's id all deserve, since the API scopes reads to the caller's own
 * corporate.
 */
export async function fetchUser(
  userId: number,
  signal?: AbortSignal,
): Promise<User> {
  const raw = await privateApiClient.get<unknown>(`/corporate/users/${userId}`, {
    // The page renders its own not-found; the client's toast would double up.
    silent: true,
    signal,
  });

  const user = readUser(raw);
  if (!user) throw new ApiError(404, "User not found.", { payload: raw });

  return user;
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
  form.set("disabled", input.disabled);

  if (input.phone?.trim()) form.set("phone", input.phone.trim());

  // Only when one was picked — an empty part would reach the API as the string
  // "undefined" and fail its image validation rather than being treated as absent.
  if (input.image) form.set("image", input.image, input.image.name);

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
 * `POST /corporate/users/{id}` with `_method=PATCH`.
 *
 * The route is a PATCH, but PHP does not populate `$_POST`/`$_FILES` for a
 * multipart PATCH body — and the profile photo has to ride along, exactly as
 * it does on create. Laravel's `_method` override is the standard way out, and
 * keeping it to this one function means a real PATCH is a one-line change if
 * the endpoint turns out to accept JSON.
 *
 * Roles are not in the body: `assignRoles` owns them.
 */
export function updateUser(
  userId: number,
  input: UpdateUserInput,
): Promise<MutationResult> {
  const form = new FormData();

  form.set("_method", "PATCH");
  form.set("first_name", input.first_name);
  form.set("last_name", input.last_name);
  form.set("name", `${input.first_name} ${input.last_name}`.trim());
  form.set("email", input.email);
  form.set("disabled", input.disabled);

  if (input.phone?.trim()) form.set("phone", input.phone.trim());

  // Only when a new one was picked — an absent part leaves the stored photo
  // alone, where an empty one would reach the API as the string "undefined".
  if (input.image) form.set("image", input.image, input.image.name);

  return privateApiClient.mutate("POST", `/corporate/users/${userId}`, form, {
    // The form maps 422 field errors onto its own inputs.
    silent: true,
  });
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

/**
 * `DELETE /corporate/users/{id}`.
 *
 * `silent` because the row's own mutation words the failure — the API explains
 * a refusal better than our generic copy (a user who still owns consignments
 * cannot be removed).
 */
export function deleteUser(userId: number): Promise<MutationResult> {
  return privateApiClient.mutate("DELETE", `/corporate/users/${userId}`, undefined, {
    silent: true,
  });
}
