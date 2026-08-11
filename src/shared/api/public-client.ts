import { API_BASE_URL } from "@/shared/config/env";
import { toast } from "@/shared/components/toast/toast";

import { ApiError } from "./errors";
import { createApiClient } from "./http/create-client";
import { IS_DEV_LOGGING, logRequest, logResponse } from "./http/logger";

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
 */
export const publicApiClient = createApiClient({
  name: "public",
  baseUrl: API_BASE_URL,
  // No cookie should ever ride along on a public call.
  credentials: "omit",
});

/* -------------------------------------------------------------------------- */
/* Interceptors — order matters, they run top to bottom.                      */
/* -------------------------------------------------------------------------- */

if (IS_DEV_LOGGING) {
  publicApiClient.interceptors.request.use((config) => {
    logRequest(config);
    return config;
  });

  publicApiClient.interceptors.response.use((response) => {
    logResponse(response);
    return response;
  });
}

/** Surfaces failures as a toast unless the caller opted out with `silent`. */
publicApiClient.interceptors.error.use((error, config) => {
  if (!config.silent && error instanceof ApiError) {
    // 422s render field-by-field on the form; a toast on top is noise.
    if (!error.isValidationError) toast.error(error.message);
  }

  throw error;
});
