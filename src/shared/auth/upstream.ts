/** Server-only access to the DpNEx API. Never import from a `"use client"` module. */

/** Endpoint prefixes the gateway may reach. `/admin/*` is deliberately absent. */
export const ALLOWED_PREFIXES = ["me", "meta", "corporate/"] as const;

/** Required by `/me` and every `/corporate/*` route. A code (`CDEFGH`), not `corporate_id`. */
export const CORPORATE_CODE_HEADER = "X-Corporate-Code";

export function getApiBaseUrl(): string {
  const raw = process.env.API_BASE_URL;
  if (!raw) {
    throw new Error(
      "API_BASE_URL is not set. Copy .env.example to .env.local and fill it in.",
    );
  }
  return raw.replace(/\/+$/, "");
}

export function isAllowedPath(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? path.startsWith(prefix) : path === prefix,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readCode(candidate: unknown): string | undefined {
  if (!isRecord(candidate)) return undefined;

  for (const key of ["code", "corporate_code", "corp_code", "slug"]) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Accepts the plausible `corporates` shapes; returns undefined rather than guessing. */
export function resolveCorporateCode(user: unknown): string | undefined {
  if (!isRecord(user)) return undefined;

  const direct = readCode(user);
  if (direct) return direct;

  const corporates = user.corporates;
  if (Array.isArray(corporates)) {
    for (const entry of corporates) {
      const code = readCode(entry);
      if (code) return code;
    }
    return undefined;
  }

  return readCode(corporates);
}

const UPSTREAM_TIMEOUT_MS = 15_000;

export interface UpstreamInit extends RequestInit {
  corporateCode?: string | undefined;
}

export function upstreamFetchUrl(
  url: URL,
  token: string,
  init: UpstreamInit = {},
): Promise<Response> {
  const { corporateCode, ...rest } = init;

  const headers = new Headers(rest.headers);
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "application/json");
  if (corporateCode) headers.set(CORPORATE_CODE_HEADER, corporateCode);

  return fetch(url, {
    ...rest,
    headers,
    cache: "no-store",
    signal: rest.signal ?? AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
}

export function upstreamFetch(
  path: string,
  token: string,
  init: UpstreamInit = {},
): Promise<Response> {
  return upstreamFetchUrl(
    new URL(`${getApiBaseUrl()}/${path.replace(/^\/+/, "")}`),
    token,
    init,
  );
}

/** First 300 characters of a response body, for server-side diagnostics. */
export async function bodySnippet(response: Response): Promise<string> {
  try {
    return (await response.clone().text()).slice(0, 300);
  } catch {
    return "<unreadable>";
  }
}
