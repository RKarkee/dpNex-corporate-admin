import type { AxiosResponse } from "axios";

import { IS_DEV } from "@/shared/config/env";

import type { RequestConfig } from "./types";

/**
 * Development-only request logging.
 *
 * Guarded by a constant so the bundler can drop every call site in a
 * production build, and never prints headers — `Authorization` and
 * `X-Corporate-Code` would land in the browser console otherwise.
 */

export const IS_DEV_LOGGING = IS_DEV && typeof window !== "undefined";

const started = new WeakMap<RequestConfig, number>();

export function logRequest(config: RequestConfig): void {
  started.set(config, performance.now());
  console.debug(
    `%c→ ${config.method} %c${config.url}`,
    "color:#64748b;font-weight:600",
    "color:#0b2545",
  );
}

export function logResponse(response: AxiosResponse): void {
  const start = started.get(response.config);
  const ms = start ? Math.round(performance.now() - start) : undefined;

  console.debug(
    `%c← ${response.status} %c${response.config.url}%c ${ms ?? "?"}ms`,
    "color:#15803d;font-weight:600",
    "color:#0b2545",
    "color:#94a3b8",
  );
}

export function logError(config: RequestConfig | undefined, error: unknown): void {
  if (!IS_DEV_LOGGING || !config) return;
  console.debug(
    `%c✕ ${config.method} %c${config.url}`,
    "color:#b3261e;font-weight:600",
    "color:#0b2545",
    error,
  );
}
