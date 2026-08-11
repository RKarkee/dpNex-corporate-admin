import type { PageMeta } from "../types";

/** The shapes the client and its interceptors pass around. */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly (string | number)[];

export type QueryParams = Record<string, QueryValue>;

/** Per-call options a service passes in. Everything is optional. */
export interface RequestOptions {
  /** Appended to the URL. `undefined`, `null` and `""` are dropped. */
  params?: QueryParams;
  /** Extra headers, merged over the client defaults. */
  headers?: HeadersInit;
  /** Caller-owned cancellation, e.g. from React Query. */
  signal?: AbortSignal;
  /** Overrides the client default. Milliseconds. */
  timeout?: number;
  /**
   * The API nests payloads under a per-endpoint key
   * (`data.consignmentrequests`). Set this and the client hands back that
   * value directly; leave it off and you get `data` whole.
   */
  unwrap?: string;
  /** `blob` for downloads, `text` for CSV. Defaults to `json`. */
  responseType?: "json" | "blob" | "text";
  /** Suppress the automatic error toast — for calls that render their own errors. */
  silent?: boolean;
  /** Suppress the automatic sign-out on 401 — used by the session probe itself. */
  skipAuthRedirect?: boolean;
  /** GET-only. Retries on network failure and 5xx. Defaults to 0. */
  retries?: number;
  /** Free-form, for your own interceptors to read. */
  meta?: Record<string, unknown>;
}

/** A fully-resolved request. Request interceptors receive and may mutate this. */
export interface RequestConfig extends RequestOptions {
  /** Client id, so a shared interceptor can tell public from private. */
  clientName: string;
  /** Absolute or same-origin URL, already built from baseUrl + path + params. */
  url: string;
  method: HttpMethod;
  headers: Headers;
  body?: BodyInit | null;
  /** Bookkeeping for `retries`; do not set by hand. */
  attempt: number;
}

/** What response interceptors receive. */
export interface ApiResponse<T = unknown> {
  /** Post-unwrap payload — what the caller ultimately gets. */
  data: T;
  /**
   * The envelope's `message` — "Role created successfully".
   *
   * Worth surfacing: the API words these per endpoint, and echoing what it
   * actually said beats a hardcoded string that can drift out of step with
   * what the backend did.
   */
  message?: string;
  /** The untouched parsed body, envelope and all. */
  raw: unknown;
  /** Laravel's pagination block, when the endpoint paginates. */
  meta?: PageMeta;
  status: number;
  headers: Headers;
  config: RequestConfig;
}

export type RequestInterceptor = (
  config: RequestConfig,
) => RequestConfig | Promise<RequestConfig>;

export type ResponseInterceptor = (
  response: ApiResponse,
) => ApiResponse | Promise<ApiResponse>;

/**
 * Return a value to recover (it becomes the response); throw to keep the
 * request failing. This is the hook a token-refresh retry would use.
 */
export type ErrorInterceptor = (
  error: unknown,
  config: RequestConfig,
) => ApiResponse | Promise<ApiResponse> | never;
