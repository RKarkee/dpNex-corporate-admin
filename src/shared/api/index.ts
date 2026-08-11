/**
 * The data layer's public surface. Services import from `@/shared/api` and
 * nothing deeper.
 */

export { privateApiClient } from "./private-client";
export { publicApiClient } from "./public-client";

export { createApiClient, type ApiClient, type ClientConfig } from "./http/create-client";
export { InterceptorManager } from "./http/interceptors";

export type {
  ApiResponse,
  ErrorInterceptor,
  HttpMethod,
  QueryParams,
  RequestConfig,
  RequestInterceptor,
  RequestOptions,
  ResponseInterceptor,
} from "./http/types";

export {
  ApiError,
  extractFieldErrors,
  isApiError,
  messageForStatus,
  type FieldErrors,
} from "./errors";

export { normalizeMeta, unwrap } from "./unwrap";
export type { ApiEnvelope, PageMeta, RawMeta } from "./types";
