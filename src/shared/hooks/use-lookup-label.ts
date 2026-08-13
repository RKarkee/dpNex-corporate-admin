"use client";

import { useQuery } from "@tanstack/react-query";

import {
  resolveLookupLabel,
  type LookupKind,
} from "@/shared/api/services/lookup.service";

/**
 * The readable name for a stored lookup code.
 *
 * For the case an `AsyncCombobox` cannot solve on its own: a form seeded from
 * an existing record holds `USD`, and the combobox only learns that means
 * "US dollar" once its list has been opened and fetched. Until then the trigger
 * would show the raw code — or, worse, the placeholder.
 *
 * Returns the code itself until the real label arrives, so the field is never
 * blank and never flashes empty. A failed lookup keeps showing the code, which
 * is exactly what it showed before.
 *
 * Idle when there is no code, so a blank optional field costs nothing.
 */
export function useLookupLabel(
  kind: LookupKind,
  code: string | undefined | null,
): string {
  const value = String(code ?? "").trim();

  const { data } = useQuery({
    queryKey: ["lookup-label", kind, value] as const,
    queryFn: () => resolveLookupLabel(kind, value),
    enabled: value.length > 0,
    // A code's label cannot change during a session, and the service memoises
    // the request anyway — refetching would be pure noise.
    staleTime: Infinity,
    gcTime: 24 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  return data ?? value;
}
