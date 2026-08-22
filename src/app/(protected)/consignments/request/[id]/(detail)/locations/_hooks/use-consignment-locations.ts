"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import {
  locationErrorsFromResponse,
  visibleLocationFields,
} from "../_components/location-validation";
import {
  createLocation,
  deleteLocation,
  fetchLocation,
  listLocations,
  updateLocation,
  type LocationInput,
} from "../services/locations.service";

/**
 * Query keys for one request's locations.
 *
 * Scoped by `requestId` so two requests open in two tabs never share a cache
 * entry, and invalidating one leaves the other alone.
 */
export const locationKeys = {
  all: (requestId: string) => ["consignment-locations", requestId] as const,
  list: (requestId: string, page: number, perPage: number) =>
    [...locationKeys.all(requestId), "list", { page, perPage }] as const,
  detail: (requestId: string, locationId: number) =>
    [...locationKeys.all(requestId), "detail", locationId] as const,
};

/**
 * One page of locations.
 *
 * `keepPreviousData` keeps the table populated while the next page loads,
 * rather than collapsing to a skeleton and back on every page change.
 */
export function useConsignmentLocations(
  requestId: string,
  page: number,
  perPage = 10,
) {
  return useQuery({
    queryKey: locationKeys.list(requestId, page, perPage),
    queryFn: ({ signal }) => listLocations({ requestId, page, perPage, signal }),
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
  requestId: string,
  locationId: number | undefined,
  placeholder?: unknown,
) {
  return useQuery({
    queryKey: locationKeys.detail(requestId, locationId ?? -1),
    queryFn: ({ signal }) =>
      fetchLocation(requestId, locationId as number, signal),
    enabled: typeof locationId === "number",
    placeholderData: placeholder as never,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

function reportError(error: unknown, fallbackTitle: string): void {
  toast.error(
    isApiError(error) ? { title: fallbackTitle, message: error.message } : error,
  );
}

export interface SaveLocationVariables {
  /** Absent for a create. */
  id?: number;
  input: LocationInput;
}

export function useSaveConsignmentLocation(requestId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: SaveLocationVariables) =>
      id
        ? updateLocation(requestId, id, input)
        : createLocation(requestId, input),

    onSuccess: async (result, variables) => {
      toast.success(
        result.message?.trim() ||
          (variables.id ? "Location updated" : "Location added"),
      );
      await queryClient.invalidateQueries({
        queryKey: locationKeys.all(requestId),
      });
    },

    /**
     * Silent only when the form will render the message itself.
     *
     * The previous version suppressed the toast for *every* validation error,
     * on the assumption the form always had a field to hang it on. A 422 naming
     * something the form does not render — or any non-field message — then
     * vanished entirely, and the save looked like it simply did nothing.
     *
     * `locationErrorsFromResponse` is the single arbiter: whatever it cannot
     * place, this reports.
     */
    onError: (error, variables) => {
      const visible = visibleLocationFields(variables.input);
      if (Object.keys(locationErrorsFromResponse(error, visible)).length) return;
      reportError(error, "Could not save location");
    },
  });
}

export function useDeleteConsignmentLocation(requestId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (locationId: number) => deleteLocation(requestId, locationId),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Location deleted");
      await queryClient.invalidateQueries({
        queryKey: locationKeys.all(requestId),
      });
    },

    onError: (error) => reportError(error, "Could not delete location"),
  });
}
