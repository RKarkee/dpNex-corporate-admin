"use client";

import { ApiError, messageForStatus } from "./errors";

/** Browser-side client. Everything goes to /api/gateway/*, so there is no token here. */

const GATEWAY_PREFIX = "/api/gateway/";

export interface ApiFetchInit extends Omit<RequestInit, "body"> {
  body?: BodyInit | null;
  /** Appended to the URL, skipping `undefined` and `null` values. */
  searchParams?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(
  path: string,
  searchParams: ApiFetchInit["searchParams"],
): string {
  const url = new URL(
    GATEWAY_PREFIX + path.replace(/^\/+/, ""),
    window.location.origin,
  );

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.pathname + url.search;
}

/** Hard navigation, so the React tree and every cached query are discarded. */
function abandonSession(): void {
  window.location.assign("/login?expired=1");
}

export async function apiFetch<T>(
  path: string,
  init: ApiFetchInit = {},
): Promise<T> {
  const { searchParams, headers, ...rest } = init;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, searchParams), {
      ...rest,
      credentials: "same-origin",
      headers: { Accept: "application/json", ...headers },
    });
  } catch {
    throw new ApiError(0, "Could not reach the service. Check your connection.");
  }

  if (response.status === 401) {
    abandonSession();
    throw new ApiError(401, messageForStatus(401));
  }

  const payload = await response.json().catch(() => undefined);

  if (!response.ok) {
    throw new ApiError(response.status, messageForStatus(response.status), payload);
  }

  return payload as T;
}
