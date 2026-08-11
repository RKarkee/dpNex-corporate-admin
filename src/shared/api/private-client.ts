import { getActiveCorporateCode, getAuthToken } from "@/shared/auth/auth-store";
import { toast } from "@/shared/components/toast/toast";
import { API_BASE_URL } from "@/shared/config/env";

import { ApiError } from "./errors";
import { createApiClient } from "./http/create-client";
import { IS_DEV_LOGGING, logError, logRequest, logResponse } from "./http/logger";

/**
 * Authenticated calls. Everything that needs a signed-in user goes here.
 *
 *   const users = await privateApiClient.get<User[]>("/corporate/users", {
 *     unwrap: "users",
 *   });
 *   // → GET https://api.dpnex.com/api/v1/corporate/users
 *   //   Authorization: Bearer <token>
 *   //   X-Corporate-Code: ABCDEF
 *
 * Both headers are attached by the interceptors below, reading from
 * `useAuthStore`. Services never touch the token.
 */
export const privateApiClient = createApiClient({
  name: "private",
  baseUrl: API_BASE_URL,
  // The API authenticates by bearer token, not by cookie. Sending credentials
  // cross-origin would also force the API to name this exact origin in CORS
  // and set `Allow-Credentials`, for no benefit.
  credentials: "omit",
});

/* -------------------------------------------------------------------------- */
/* Request interceptors — run in registration order.                          */
/* -------------------------------------------------------------------------- */

/** The token, on every request. */
privateApiClient.interceptors.request.use((config) => {
  const token = getAuthToken();

  // Not thrown on: a missing token means the session lapsed, and the 401 path
  // below already knows how to handle that. Throwing here would produce a
  // different error shape for the same situation.
  if (token && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${token}`);
  }

  return config;
});

/** Corporate scope. The API rejects every `/corporate/*` route without it. */
privateApiClient.interceptors.request.use((config) => {
  const code = getActiveCorporateCode();
  if (code && !config.headers.has("X-Corporate-Code")) {
    config.headers.set("X-Corporate-Code", code);
  }
  return config;
});

if (IS_DEV_LOGGING) {
  privateApiClient.interceptors.request.use((config) => {
    logRequest(config);
    return config;
  });

  privateApiClient.interceptors.response.use((response) => {
    logResponse(response);
    return response;
  });
}

/* -------------------------------------------------------------------------- */
/* Error interceptor                                                          */
/* -------------------------------------------------------------------------- */

/**
 * The one path that ends a session without the user asking.
 *
 * A 401 means the token is dead upstream, so it is torn down exactly as logout
 * does — and then nothing else happens here. Clearing the store flips
 * `AuthGuard` to "no token", and the guard navigates.
 *
 * That indirection is the point: redirect logic lives in exactly one place,
 * and this module stays free of routing. It is a plain module with no router
 * to call, so the alternative was `window.location`, which reloads the whole
 * app to reach a screen the client could already render.
 *
 * `signingOut` guards against ten parallel 401s each tearing down in turn.
 */
let signingOut = false;

async function abandonSession(): Promise<void> {
  if (signingOut || typeof window === "undefined") return;
  signingOut = true;

  // Imported lazily to break the cycle — the service imports this module.
  const { logout } = await import("@/shared/api/services/auth.service");
  logout();

  // The flag is per page load; a soft navigation would leave it stuck on and
  // silently swallow the next expiry.
  window.setTimeout(() => {
    signingOut = false;
  }, 1_000);
}

privateApiClient.interceptors.error.use((error, config) => {
  logError(config, error);

  if (!(error instanceof ApiError)) throw error;

  if (error.isUnauthorized && !config.skipAuthRedirect) {
    toast.error("Your session has ended. Please sign in again.");
    void abandonSession();
    throw error;
  }

  if (!config.silent && !error.isValidationError) {
    toast.error(error.message);
  }

  throw error;
});
