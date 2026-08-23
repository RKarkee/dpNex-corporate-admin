"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { fetchLocation, listLocations } from "../services/locations.service";

/**
 * Query keys for one request's locations.
 *
 * Scoped by `consignmentId` so two requests open in two tabs never share a cache
 * entry, and invalidating one leaves the other alone.
 */
export const locationKeys = {
  all: (consignmentId: string) => ["consignment-locations", consignmentId] as const,
  list: (consignmentId: string, page: number, perPage: number) =>
    [...locationKeys.all(consignmentId), "list", { page, perPage }] as const,
  detail: (consignmentId: string, locationId: number) =>
    [...locationKeys.all(consignmentId), "detail", locationId] as const,
};

/**
 * One page of locations.
 *
 * `keepPreviousData` keeps the table populated while the next page loads,
 * rather than collapsing to a skeleton and back on every page change.
 */
export function useConsignmentLocations(
  consignmentId: string,
  page: number,
  perPage = 10,
) {
  return useQuery({
    queryKey: locationKeys.list(consignmentId, page, perPage),
    queryFn: ({ signal }) => listLocations({ consignmentId, page, perPage, signal }),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

/**
 * One location, read fresh when a dialog opens.
 *
 * `enabled` makes this safe to call unconditionally from a dialog that may have
 * nothing selected. The list row seeds `placeholderData` so the dialog paints
 * immediately with what is known.
 */
export function useConsignmentLocation(
  consignmentId: string,
  locationId: number | undefined,
  placeholder?: unknown,
) {
  return useQuery({
    queryKey: locationKeys.detail(consignmentId, locationId ?? -1),
    queryFn: ({ signal }) =>
      fetchLocation(consignmentId, locationId as number, signal),
    enabled: typeof locationId === "number",
    placeholderData: placeholder as never,
    staleTime: 0,
    refetchOnMount: "always",
  });
}
