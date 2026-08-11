import { ApiError } from "@/shared/api/errors";
import { privateApiClient } from "@/shared/api/private-client";
import { publicApiClient } from "@/shared/api/public-client";
import { useAuthStore } from "@/shared/auth/auth-store";
import { normalizePermissions } from "@/shared/auth/permissions";
import {
  isCorporateUser,
  isDisabled,
  type Corporate,
  type LoginResponseData,
  type LoginSession,
  type User,
} from "@/shared/auth/types";

/**
 * Auth service — the reference for how a service module is written.
 *
 * Three rules the rest of the app follows:
 *   1. Components never call a client directly; they call a service.
 *   2. A service returns domain types, never a `Response` or a raw envelope.
 *   3. Needs a session → `privateApiClient`. Does not → `publicApiClient`.
 *
 * Paths are always relative. The base URL lives in
 * `NEXT_PUBLIC_API_BASE_URL` and is applied by the client, so `"/login"`
 * here becomes `https://api.dpnex.com/api/v1/login`.
 */

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export const LOGIN_ERRORS = {
  disabled:
    "You are disabled. Please contact Admin / Support to enable the account.",
  notCorporate:
    "This portal is for corporate users only. Please use the portal for your account type.",
  noCorporate:
    "This account is not linked to a corporate account. Contact your administrator.",
  malformed: "Sign in failed — the service returned an unexpected response.",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalises `data.corporates` into a typed list.
 *
 * `corp_code` is the value `X-Corporate-Code` wants — a short code like
 * `ABCDEF`. Deliberately not read: the user's `slug`, which looks like a code
 * (`crpadmin-test`) but is a person, not a company.
 */
function readCorporates(data: unknown): Corporate[] {
  if (!isRecord(data)) return [];

  const source = Array.isArray(data.corporates)
    ? data.corporates
    : isRecord(data.user) && Array.isArray(data.user.corporates)
      ? data.user.corporates
      : [];

  const result: Corporate[] = [];

  for (const entry of source) {
    if (!isRecord(entry)) continue;

    const code = ["corp_code", "corporate_code", "code"]
      .map((key) => entry[key])
      .find((value): value is string => typeof value === "string" && !!value.trim());

    if (!code) continue;

    result.push({
      corp_code: code.trim(),
      name: typeof entry.name === "string" ? entry.name : code.trim(),
      ...(typeof entry.id === "number" ? { id: entry.id } : {}),
    });
  }

  return result;
}

/**
 * `POST /login`.
 *
 * The endpoint takes **multipart**, not JSON — hence `FormData`. Passing a
 * plain object would send `application/json` and come back 422.
 *
 * Three gates run on the response, in order. A valid credential is not enough:
 * the account must be corporate, enabled, and linked to a company. They are
 * ordered so a disabled ADM is told it is the wrong portal, not that their
 * account is off.
 */
export async function login(credentials: LoginCredentials): Promise<LoginSession> {
  const form = new FormData();
  form.set("email", credentials.email.trim());
  form.set("password", credentials.password);

  const data = await publicApiClient.post<LoginResponseData>("/login", form, {
    // The form renders the failure itself; a toast on top would double it.
    silent: true,
  });

  if (!isRecord(data) || typeof data.token !== "string" || !isRecord(data.user)) {
    throw new ApiError(502, LOGIN_ERRORS.malformed, { payload: data });
  }

  const user = data.user as unknown as User;

  // Gate 1 — user type. A valid ADM/INT/EXT credential must not open this app.
  if (!isCorporateUser(user)) {
    throw new ApiError(403, LOGIN_ERRORS.notCorporate, { payload: data });
  }

  // Gate 2 — account state.
  if (isDisabled(user)) {
    throw new ApiError(403, LOGIN_ERRORS.disabled, { payload: data });
  }

  // Gate 3 — corporate scope. Without a code every /corporate/* call 403s, so
  // a session that gets past here would be signed in and unable to do anything.
  const corporates = readCorporates(data);
  const activeCorporateCode = corporates[0]?.corp_code ?? null;

  if (!activeCorporateCode) {
    throw new ApiError(403, LOGIN_ERRORS.noCorporate, { payload: data });
  }

  const session: LoginSession = {
    token: data.token,
    user,
    corporates,
    activeCorporateCode,
  };

  // Writes the token and the whole login response into the store, and mirrors
  // it to a cookie so route gating works on the very next navigation.
  useAuthStore.getState().setSession(session, credentials.remember);

  // `/login` does not return `permissions` — `/me` does, and the sidebar needs
  // them. Deliberately after `setSession`: the token has to be in the store
  // before `privateApiClient` can authenticate this call.
  //
  // Failure is swallowed. A sign-in that worked must not be undone because a
  // follow-up call timed out; `hasPermission` fails open until the map lands.
  await hydratePermissions().catch(() => {});

  return session;
}

/**
 * Fills in `permissions` and `roles` from `GET /me`.
 *
 * Safe to call at any point after sign-in — on login, and again on a full page
 * load, where the persisted user may predate a role change made elsewhere.
 */
export async function hydratePermissions(signal?: AbortSignal): Promise<void> {
  const fresh = await fetchCurrentUser(signal);

  useAuthStore.getState().patchUser({
    ...fresh,
    permissions: normalizePermissions(fresh.permissions) ?? fresh.permissions,
  });
}

/**
 * Signs out locally, leaving nothing behind.
 *
 * Four places hold session state and all four have to go, or the next sign-in
 * on this machine inherits some of the last one:
 *
 *   1. the store        — token, user, corporates
 *   2. localStorage     — the persisted copy zustand would rehydrate from
 *   3. the cookies      — or `proxy.ts` keeps waving the user through
 *   4. the query cache  — handled by the caller, which owns the QueryClient
 *
 * The API exposes no revoke endpoint, so the token stays valid upstream until
 * it expires. This drops our copy of it.
 */
export function logout(): void {
  useAuthStore.getState().clear(); // store + cookies

  // `clear()` writes an empty state through the persist middleware; this
  // removes the key outright, so nothing is left to inspect or rehydrate.
  useAuthStore.persist.clearStorage();
}

/**
 * Re-reads the current user. `GET /me` returns `{ user }` at the top level,
 * not under `data` — the envelope varies per endpoint.
 *
 * `skipAuthRedirect` because this call is often *how* we discover the session
 * is dead; letting the interceptor redirect would pre-empt the caller.
 */
export function fetchCurrentUser(signal?: AbortSignal): Promise<User> {
  return privateApiClient.get<User>("/me", {
    unwrap: "user",
    skipAuthRedirect: true,
    silent: true,
    signal,
  });
}

/** Public endpoint — no session exists at this point. */
export async function requestPasswordReset(email: string): Promise<void> {
  await publicApiClient.post("/forgot-password", { email });
}
