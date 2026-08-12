import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

import { REQUEST_TIMEOUT_MS } from "@/shared/config/env";

import { ApiError, extractFieldErrors, preferredMessage } from "../errors";
import { normalizeMeta, unwrap } from "../unwrap";
import type {
  ApiResponse,
  HttpMethod,
  QueryParams,
  RequestConfig,
  RequestOptions,
} from "./types";

/**
 * Builds an HTTP client backed by an Axios instance.
 *
 * Two are created from this factory — `publicApiClient` and
 * `privateApiClient`. They differ only in base URL, credentials mode and
 * which interceptors are registered on the returned `axios` instance;
 * everything below is shared.
 *
 * The Axios instance is returned alongside `client`, never as part of it —
 * `ApiClient` has no `.axios` field, so the raw transport cannot leak past
 * `private-client.ts`/`public-client.ts`, which are the only other files
 * that see this return value.
 */

export interface ClientConfig {
  /** Shows up in errors and lets shared interceptors branch. */
  name: string;
  /** Absolute (`https://api.dpnex.com/api/v1`) or same-origin (`/api/gateway`). */
  baseUrl: string;
  /** `same-origin`/`include` sends cookies; `omit` (both clients today) keeps calls anonymous. */
  credentials?: RequestCredentials;
  /** Applied to every request, overridable per call. */
  headers?: Record<string, string>;
  timeout?: number;
}

const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    (Object.getPrototypeOf(value) === Object.prototype ||
      Object.getPrototypeOf(value) === null)
  );
}

function appendParams(search: URLSearchParams, params: QueryParams | undefined): void {
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      // Laravel reads repeated `key[]` as an array.
      for (const entry of value) search.append(`${key}[]`, String(entry));
      continue;
    }

    search.append(key, String(value));
  }
}

/** Ports the old client's exact query-string shape rather than trusting Axios's own array serialization defaults. */
function serializeParams(params: QueryParams | undefined): string {
  const search = new URLSearchParams();
  appendParams(search, params);
  return search.toString();
}

function toPlainHeaders(headers: HeadersInit | undefined): Record<string, string> {
  if (!headers) return {};
  return Object.fromEntries(new Headers(headers).entries());
}

function toFetchHeaders(headers: AxiosResponse["headers"]): Headers {
  const result = new Headers();
  const withToJSON = headers as { toJSON?: () => Record<string, string | string[] | undefined> };
  const source =
    typeof withToJSON.toJSON === "function"
      ? withToJSON.toJSON()
      : (headers as Record<string, string | string[] | undefined>);

  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue;
    result.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  return result;
}

/**
 * Reads the response body according to what the caller asked for.
 *
 * `responseType: "text"` is used at the transport level for both the default
 * (JSON) and explicit "text" cases, which stops Axios attempting its own
 * JSON parsing — its default silently falls back to a string on a parse
 * failure, where this client throws, matching the old `parseBody()` exactly.
 */
function parseRaw(response: AxiosResponse, app: RequestOptions | undefined): unknown {
  if (response.status === 204 || response.status === 205) return undefined;
  if (response.config.responseType === "blob") return response.data;
  if (app?.responseType === "text") return response.data;

  const text = response.data as string;
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // An HTML error page or a PHP notice — surface it as a server error, not
    // a parse crash, so the user sees copy instead of a stack trace. `cause`
    // carries the response (and its `config.app`) so a downstream interceptor
    // can still read `silent`/`skipAuthRedirect` off this error.
    throw new ApiError(response.status || 502, "Unexpected response from the service.", {
      payload: text.slice(0, 300),
      cause: response,
    });
  }
}

/** Peels the `{ status, message, data }` envelope when there is one. */
function extractData(raw: unknown): unknown {
  if (isPlainObject(raw) && "data" in raw && "status" in raw) return raw.data;
  return raw;
}

/**
 * The envelope's own `message`, if it is fit to show.
 *
 * Length-capped because a few endpoints put a stack trace or a paragraph of
 * SQL in there on partial failures, and a toast is not the place for it.
 */
function extractMessage(raw: unknown): string | undefined {
  if (!isPlainObject(raw) || typeof raw.message !== "string") return undefined;

  const message = raw.message.trim();
  return message && message.length <= 200 ? message : undefined;
}

function toApiResponse(response: AxiosResponse): ApiResponse {
  const app = response.config.app;
  const raw = parseRaw(response, app);
  const data = app?.unwrap ? unwrap(raw, app.unwrap) : extractData(raw);

  return {
    data,
    message: extractMessage(raw),
    raw,
    meta: normalizeMeta(raw),
    status: response.status,
    headers: toFetchHeaders(response.headers),
    config: response.config,
  };
}

/**
 * Converts a rejected Axios call into the project's single thrown type.
 *
 * A caller-initiated abort (React Query cancellation) is rethrown exactly as
 * Axios produced it — untouched — so React Query's own cancellation
 * detection, which is signal-based rather than error-type-based, keeps
 * telling a cancellation apart from a genuine network outage.
 */
function toApiError(error: unknown): unknown {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error(String(error));
  }

  const app = error.config?.app;
  if (app?.signal?.aborted || axios.isCancel(error)) return error;

  if (error.code === "ECONNABORTED" && !error.response) {
    return new ApiError(408, "The request took too long. Please try again.", { cause: error });
  }

  if (!error.response) {
    return new ApiError(
      0,
      "Could not reach the service. Check your connection and try again.",
      { cause: error },
    );
  }

  // May itself throw ApiError(502-ish) for an unparseable body — propagates
  // as-is, matching the old client's parse-before-status-check ordering.
  const raw = parseRaw(error.response, app);
  const { display, upstream } = preferredMessage(error.response.status, raw);

  return new ApiError(error.response.status, display, {
    payload: raw,
    upstreamMessage: upstream,
    fieldErrors: error.response.status === 422 ? extractFieldErrors(raw) : undefined,
    cause: error,
  });
}

/**
 * Recovers the original per-call `RequestOptions` and request identity from a
 * converted `ApiError`, for interceptors that only ever see the converted
 * error (never the raw Axios shape) but still need `silent`/`skipAuthRedirect`
 * or the method/URL for a dev-log line.
 */
export function requestConfigOf(error: unknown): RequestConfig | undefined {
  if (!(error instanceof ApiError)) return undefined;
  return (error.cause as { config?: RequestConfig } | undefined)?.config;
}

export interface ApiClient {
  readonly name: string;
  readonly baseUrl: string;

  /** Full response, for the rare caller that needs headers or `meta`. */
  request<T = unknown>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<ApiResponse<T>>;

  get<T = unknown>(path: string, options?: RequestOptions): Promise<T>;
  post<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  put<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown, options?: RequestOptions): Promise<T>;
  delete<T = unknown>(path: string, options?: RequestOptions): Promise<T>;

  /** GET a list endpoint and keep the pagination block. */
  paginated<T = unknown>(
    path: string,
    options: RequestOptions & { unwrap: string },
  ): Promise<{ items: T[]; meta: ApiResponse["meta"] }>;

  /**
   * A write that keeps the API's own success message, for the toast.
   *
   * `post()` and friends return only `data`, which is right for reads and for
   * writes whose response you consume. Use this when you want to echo what the
   * server said rather than hardcode "Saved".
   */
  mutate<T = unknown>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: RequestOptions,
  ): Promise<MutationResult<T>>;
}

/** What a write returns when you care about the server's wording. */
export interface MutationResult<T = unknown> {
  data: T;
  /** The envelope's `message`, e.g. "Role created successfully". */
  message?: string;
  status: number;
}

function shouldRetry(
  error: unknown,
  method: HttpMethod,
  attempt: number,
  retries: number | undefined,
): boolean {
  const max = retries ?? 0;
  if (attempt >= max) return false;
  if (method !== "GET") return false; // only GET is safe to repeat
  if (!(error instanceof ApiError)) return false;

  return error.status === 0 || RETRYABLE_STATUSES.has(error.status);
}

export function createApiClient(config: ClientConfig): { client: ApiClient; axios: AxiosInstance } {
  const axiosInstance = axios.create({
    baseURL: config.baseUrl,
    headers: { Accept: "application/json", ...config.headers },
    timeout: config.timeout ?? REQUEST_TIMEOUT_MS,
    withCredentials: config.credentials === "include" || config.credentials === "same-origin",
    paramsSerializer: { serialize: serializeParams },
  });

  // Both registered first, so they run before any interceptor
  // `private-client.ts`/`public-client.ts` add afterward — Axios response
  // interceptors run in registration order (FIFO), so a downstream error
  // interceptor (the 401 handler, the toast) always sees an already-converted
  // `ApiError`, never a raw Axios shape.
  //
  // The full `ApiResponse` conversion happens in `rawRequest()` below, since
  // Axios's own types don't let a response interceptor change the resolved
  // shape — but a malformed body, or a body missing the key `unwrap` expects,
  // still has to fail *inside* Axios's own promise chain (not after it, in
  // `rawRequest`) for a downstream error interceptor to ever see it. So this
  // pair validates eagerly — parsing the body and, when the caller asked for
  // one, unwrapping the envelope key — purely to raise the same errors
  // `toApiResponse()` would raise later, discarding the result here and
  // letting the rejection carry through to the conversion interceptor below.
  axiosInstance.interceptors.response.use((response) => {
    const app = response.config.app;
    const raw = parseRaw(response, app);

    if (app?.unwrap) {
      try {
        unwrap(raw, app.unwrap);
      } catch (unwrapError) {
        // `unwrap()` itself carries no `cause` — rebuild the same error with
        // one attached, so `requestConfigOf()` can still recover
        // `silent`/`skipAuthRedirect` downstream. Same status/message/payload;
        // only the transport-level `cause` is added.
        if (unwrapError instanceof ApiError) {
          throw new ApiError(unwrapError.status, unwrapError.message, {
            payload: unwrapError.payload,
            fieldErrors: unwrapError.fieldErrors,
            upstreamMessage: unwrapError.upstreamMessage,
            cause: response,
          });
        }
        throw unwrapError;
      }
    }

    return response;
  });
  axiosInstance.interceptors.response.use(undefined, (error: unknown) => {
    throw toApiError(error);
  });

  function buildConfig(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: RequestOptions,
  ): AxiosRequestConfig {
    return {
      url: path,
      method,
      params: options.params,
      headers: toPlainHeaders(options.headers),
      data: method === "GET" ? undefined : body,
      signal: options.signal,
      timeout: options.timeout,
      responseType: options.responseType === "blob" ? "blob" : "text",
      app: options,
    };
  }

  async function rawRequest<T>(axiosConfig: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await axiosInstance.request<unknown>(axiosConfig);
    // Same cast the old fetch-based client made at this exact boundary
    // (`(await send(cfg)) as ApiResponse<T>`) — `data`'s real shape is only
    // known to the caller, not to the client building it.
    return toApiResponse(response) as ApiResponse<T>;
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    let attempt = 0;

    for (;;) {
      try {
        return await rawRequest<T>(buildConfig(method, path, body, options));
      } catch (error) {
        if (shouldRetry(error, method, attempt, options.retries)) {
          attempt += 1;
          // Exponential backoff, capped — 300ms, 600ms, 1200ms…
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(300 * 2 ** (attempt - 1), 4_000)),
          );
          continue;
        }

        throw error;
      }
    }
  }

  const client: ApiClient = {
    name: config.name,
    baseUrl: config.baseUrl,
    request,

    async get<T>(path: string, options?: RequestOptions) {
      return (await request<T>("GET", path, undefined, options)).data;
    },
    async post<T>(path: string, body?: unknown, options?: RequestOptions) {
      return (await request<T>("POST", path, body, options)).data;
    },
    async put<T>(path: string, body?: unknown, options?: RequestOptions) {
      return (await request<T>("PUT", path, body, options)).data;
    },
    async patch<T>(path: string, body?: unknown, options?: RequestOptions) {
      return (await request<T>("PATCH", path, body, options)).data;
    },
    async delete<T>(path: string, options?: RequestOptions) {
      return (await request<T>("DELETE", path, undefined, options)).data;
    },

    async paginated<T>(path: string, options: RequestOptions & { unwrap: string }) {
      const response = await request<T[]>("GET", path, undefined, options);
      return {
        items: Array.isArray(response.data) ? response.data : [],
        meta: response.meta,
      };
    },

    async mutate<T>(
      method: HttpMethod,
      path: string,
      body?: unknown,
      options?: RequestOptions,
    ): Promise<MutationResult<T>> {
      const response = await request<T>(method, path, body, options);
      return {
        data: response.data,
        message: response.message,
        status: response.status,
      };
    },
  };

  return { client, axios: axiosInstance };
}
