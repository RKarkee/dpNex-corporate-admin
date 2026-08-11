import { REQUEST_TIMEOUT_MS } from "@/shared/config/env";

import {
  ApiError,
  extractFieldErrors,
  preferredMessage,
} from "../errors";
import { normalizeMeta, unwrap } from "../unwrap";
import { InterceptorManager } from "./interceptors";
import type {
  ApiResponse,
  ErrorInterceptor,
  HttpMethod,
  QueryParams,
  RequestConfig,
  RequestInterceptor,
  RequestOptions,
  ResponseInterceptor,
} from "./types";

/**
 * Builds an HTTP client with its own interceptor stack.
 *
 * Two are created from this factory — `publicApiClient` and
 * `privateApiClient`. They differ only in base URL, credentials mode and which
 * interceptors are registered; everything below is shared.
 *
 * Why hand-rolled instead of axios: `fetch` is what Next.js instruments for
 * caching and what runs unchanged in the Edge runtime. axios pulls in an
 * XHR adapter that does neither, for an API surface we use maybe 5% of.
 */

export interface ClientConfig {
  /** Shows up in errors and lets shared interceptors branch. */
  name: string;
  /** Absolute (`https://api.dpnex.com/api/v1`) or same-origin (`/api/gateway`). */
  baseUrl: string;
  /** `same-origin` sends the session cookie; `omit` keeps public calls anonymous. */
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

/** Bodies fetch already knows how to send are passed through untouched. */
function isRawBody(value: unknown): value is BodyInit {
  return (
    typeof value === "string" ||
    (typeof FormData !== "undefined" && value instanceof FormData) ||
    (typeof Blob !== "undefined" && value instanceof Blob) ||
    (typeof URLSearchParams !== "undefined" &&
      value instanceof URLSearchParams) ||
    (typeof ArrayBuffer !== "undefined" && value instanceof ArrayBuffer) ||
    ArrayBuffer.isView(value as ArrayBufferView)
  );
}

function appendParams(url: URL, params: QueryParams | undefined): void {
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;

    if (Array.isArray(value)) {
      // Laravel reads repeated `key[]` as an array.
      for (const entry of value) url.searchParams.append(`${key}[]`, String(entry));
      continue;
    }

    url.searchParams.append(key, String(value));
  }
}

/** Same-origin bases need an origin to parse against; on the server there is none. */
function resolveOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost";
}

function buildUrl(
  baseUrl: string,
  path: string,
  params: QueryParams | undefined,
): string {
  const relative = !/^https?:\/\//i.test(baseUrl);
  const origin = relative ? resolveOrigin() : undefined;

  const joined = `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const url = origin ? new URL(joined, origin) : new URL(joined);

  appendParams(url, params);

  // Same-origin clients keep the URL relative so nothing hardcodes a host.
  return relative ? url.pathname + url.search : url.toString();
}

/**
 * Merges the caller's signal with our timeout, so whichever fires first wins.
 * Without this, a React Query cancellation would be ignored past the timeout.
 */
function withTimeout(
  signal: AbortSignal | undefined,
  timeout: number,
): { signal: AbortSignal; dispose: () => void } {
  const timeoutSignal = AbortSignal.timeout(timeout);
  if (!signal) return { signal: timeoutSignal, dispose: () => {} };

  const controller = new AbortController();
  const abort = () => controller.abort();

  signal.addEventListener("abort", abort, { once: true });
  timeoutSignal.addEventListener("abort", abort, { once: true });

  return {
    signal: controller.signal,
    dispose: () => {
      signal.removeEventListener("abort", abort);
      timeoutSignal.removeEventListener("abort", abort);
    },
  };
}

async function parseBody(
  response: Response,
  responseType: RequestOptions["responseType"],
): Promise<unknown> {
  if (response.status === 204 || response.status === 205) return undefined;
  if (responseType === "blob") return response.blob();
  if (responseType === "text") return response.text();

  const text = await response.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    // An HTML error page or a PHP notice — surface it as a server error, not a
    // parse crash, so the user sees copy instead of a stack trace.
    throw new ApiError(response.status || 502, "Unexpected response from the service.", {
      payload: text.slice(0, 300),
    });
  }
}

export interface ApiClient {
  readonly name: string;
  readonly baseUrl: string;

  interceptors: {
    request: InterceptorManager<RequestInterceptor>;
    response: InterceptorManager<ResponseInterceptor>;
    error: InterceptorManager<ErrorInterceptor>;
  };

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
}

export function createApiClient(config: ClientConfig): ApiClient {
  const interceptors = {
    request: new InterceptorManager<RequestInterceptor>(),
    response: new InterceptorManager<ResponseInterceptor>(),
    error: new InterceptorManager<ErrorInterceptor>(),
  };

  const defaultTimeout = config.timeout ?? REQUEST_TIMEOUT_MS;

  function buildConfig(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: RequestOptions,
    attempt: number,
  ): RequestConfig {
    const headers = new Headers({
      Accept: "application/json",
      ...config.headers,
    });

    for (const [key, value] of new Headers(options.headers ?? {})) {
      headers.set(key, value);
    }

    let payload: BodyInit | null | undefined;

    if (body !== undefined && body !== null && method !== "GET") {
      if (isRawBody(body)) {
        // Never set Content-Type for FormData — fetch must add the boundary.
        payload = body;
      } else {
        payload = JSON.stringify(body);
        if (!headers.has("Content-Type")) {
          headers.set("Content-Type", "application/json");
        }
      }
    }

    return {
      ...options,
      clientName: config.name,
      url: buildUrl(config.baseUrl, path, options.params),
      method,
      headers,
      body: payload,
      attempt,
    };
  }

  async function send(initial: RequestConfig): Promise<ApiResponse> {
    let current = initial;

    for (const interceptor of interceptors.request.list()) {
      current = await interceptor(current);
    }

    const { signal, dispose } = withTimeout(
      current.signal,
      current.timeout ?? defaultTimeout,
    );

    let response: Response;
    try {
      response = await fetch(current.url, {
        method: current.method,
        headers: current.headers,
        body: current.body,
        credentials: config.credentials ?? "same-origin",
        cache: "no-store",
        signal,
      });
    } catch (error) {
      // A caller-initiated abort is not a failure — let it propagate as-is so
      // React Query can tell cancellation from a network outage.
      if (current.signal?.aborted) throw error;

      const timedOut =
        error instanceof DOMException && error.name === "TimeoutError";

      throw new ApiError(
        timedOut ? 408 : 0,
        timedOut
          ? "The request took too long. Please try again."
          : "Could not reach the service. Check your connection and try again.",
        { cause: error },
      );
    } finally {
      dispose();
    }

    const raw = await parseBody(response, current.responseType);

    if (!response.ok) {
      const { display, upstream } = preferredMessage(response.status, raw);

      throw new ApiError(response.status, display, {
        payload: raw,
        upstreamMessage: upstream,
        fieldErrors:
          response.status === 422 ? extractFieldErrors(raw) : undefined,
      });
    }

    const data = current.unwrap ? unwrap(raw, current.unwrap) : extractData(raw);

    let result: ApiResponse = {
      data,
      raw,
      meta: normalizeMeta(raw),
      status: response.status,
      headers: response.headers,
      config: current,
    };

    for (const interceptor of interceptors.response.list()) {
      result = await interceptor(result);
    }

    return result;
  }

  /** Peels the `{ status, message, data }` envelope when there is one. */
  function extractData(raw: unknown): unknown {
    if (isPlainObject(raw) && "data" in raw && "status" in raw) return raw.data;
    return raw;
  }

  function shouldRetry(error: unknown, cfg: RequestConfig): boolean {
    const max = cfg.retries ?? 0;
    if (cfg.attempt >= max) return false;
    if (cfg.method !== "GET") return false; // only GET is safe to repeat
    if (!(error instanceof ApiError)) return false;

    return error.status === 0 || RETRYABLE_STATUSES.has(error.status);
  }

  async function request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    let attempt = 0;

    for (;;) {
      const cfg = buildConfig(method, path, body, options, attempt);

      try {
        return (await send(cfg)) as ApiResponse<T>;
      } catch (error) {
        if (shouldRetry(error, cfg)) {
          attempt += 1;
          // Exponential backoff, capped — 300ms, 600ms, 1200ms…
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(300 * 2 ** (attempt - 1), 4_000)),
          );
          continue;
        }

        // The error chain runs last. A handler may return a response to
        // recover; anything it throws replaces the original error.
        let recovered: ApiResponse | undefined;

        for (const interceptor of interceptors.error.list()) {
          recovered = await interceptor(error, cfg);
          if (recovered) break;
        }

        if (recovered) return recovered as ApiResponse<T>;
        throw error;
      }
    }
  }

  return {
    name: config.name,
    baseUrl: config.baseUrl,
    interceptors,
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
  };
}
