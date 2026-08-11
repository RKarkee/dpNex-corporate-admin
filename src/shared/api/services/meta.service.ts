import { publicApiClient } from "@/shared/api/public-client";

/**
 * `GET /meta` — the enum source for every select in the app (statuses,
 * document types, unit codes…).
 *
 * Public: it needs no token and returns the same payload for everyone, which
 * is also what makes it safe to fetch before sign-in and to cache hard.
 *
 * Shape: `data.controls.<name>.values` as `{ key, label }[]`.
 */

export interface MetaOption {
  key: string;
  label: string;
}

export interface MetaControl {
  values: MetaOption[];
}

export interface MetaPayload {
  controls: Record<string, MetaControl | undefined>;
}

export function fetchMeta(signal?: AbortSignal): Promise<MetaPayload> {
  return publicApiClient.get<MetaPayload>("/meta", {
    // Transient and worth a second attempt — a failure here empties every
    // dropdown on the page.
    retries: 2,
    signal,
  });
}

/** One control's options, or `[]` if the API does not define that control. */
export async function fetchMetaOptions(
  control: string,
  signal?: AbortSignal,
): Promise<MetaOption[]> {
  const meta = await fetchMeta(signal);
  return meta.controls?.[control]?.values ?? [];
}

/**
 * Query defaults for meta. Enums change on deploy, not during a session, so
 * this is fetched once and reused rather than refetched per mount.
 */
export const metaQuery = {
  queryKey: ["meta"] as const,
  queryFn: ({ signal }: { signal?: AbortSignal }) => fetchMeta(signal),
  staleTime: 60 * 60 * 1000,
  gcTime: 24 * 60 * 60 * 1000,
};
