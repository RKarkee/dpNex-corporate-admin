import { API_BASE_URL } from "@/shared/config/env";
import { toast } from "@/shared/components/toast/toast";

import { ApiError } from "./errors";
import { createApiClient, requestConfigOf } from "./http/create-client";
import { IS_DEV_LOGGING, logError, logRequest, logResponse } from "./http/logger";

/**
 * Unauthenticated calls.
 *
 * Use for anything that works without a session: `/login`,
 * `/forgot-password`, `/meta`. No token, no cookies.
 *
 *   await publicApiClient.post("/login", form);
 *   // → POST https://api.dpnex.com/api/v1/login
 *
 *   await publicApiClient.get("/meta");
 *   // → GET  https://api.dpnex.com/api/v1/meta
 *
 * Requests go straight to the API from the browser, so the API must return
 * `Access-Control-Allow-Origin` for this origin — including
 * `http://localhost:3000` in development.
 *
 * `axios` (the raw instance) is destructured only to register interceptors
 * on it, then never referenced again — it is not exported from this module,
 * so nothing outside this file can reach it.
 */
const { client, axios } = createApiClient({
  name: "public",
  baseUrl: API_BASE_URL,
  // No cookie should ever ride along on a public call.
  credentials: "omit",
});

export const publicApiClient = client;

/* -------------------------------------------------------------------------- */
/* Interceptors — order matters, they run top to bottom.                      */
/* -------------------------------------------------------------------------- */

if (IS_DEV_LOGGING) {
  axios.interceptors.request.use((config) => {
    logRequest(config);
    return config;
  });

  axios.interceptors.response.use((response) => {
    logResponse(response);
    return response;
  });
}

/** Surfaces failures as a toast unless the caller opted out with `silent`. */
axios.interceptors.response.use(undefined, (error: unknown) => {
  // Runs after `create-client.ts`'s own conversion interceptor, so `error`
  // here is always an `ApiError` — never a raw `AxiosError`.
  const requestConfig = requestConfigOf(error);
  logError(requestConfig, error);

  if (!requestConfig?.app?.silent && error instanceof ApiError) {
    // 422s render field-by-field on the form; a toast on top is noise.
    if (!error.isValidationError) toast.error(error.message);
  }

  throw error;
});
