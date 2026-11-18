import { isApiError } from "@/shared/api/errors";

/**
 * The sentence to show under a failed form. A 422's first field message says
 * exactly what to fix, so it is preferred over the generic status copy.
 * `ApiError.message` is already sanitised.
 */
export function errorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isApiError(error)) {
    const first = error.fieldErrors ? Object.values(error.fieldErrors).flat()[0] : undefined;
    return first || error.message || fallback;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
