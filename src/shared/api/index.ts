/**
 * The data layer's public surface. Services import from `@/shared/api` and
 * nothing deeper.
 */

export { privateApiClient } from "./private-client";
export { publicApiClient } from "./public-client";

export { createApiClient, type ApiClient, type ClientConfig } from "./http/create-client";

export type {
  ApiResponse,
  HttpMethod,
  QueryParams,
  RequestConfig,
  RequestOptions,
} from "./http/types";

export {
  ApiError,
  extractErrorMessages,
  extractFieldErrors,
  isApiError,
  messageForStatus,
  summarizeMessages,
  type FieldErrors,
} from "./errors";

export { normalizeMeta, unwrap } from "./unwrap";
export type { ApiEnvelope, PageMeta, RawMeta } from "./types";
