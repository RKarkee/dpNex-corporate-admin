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
  createCharge,
  deleteCharge,
  fetchCharge,
  listCharges,
  updateCharge,
} from "../services/charges.service";
import type { ChargeFilters, ChargeInput, ConsignmentCharge } from "../types";

/**
 * Query keys for one request's charges — scoped by `requestId`, so two
 * requests open side by side never share an entry.
 */
export const chargeKeys = {
  all: (requestId: string) => ["consignment-charges", requestId] as const,
  list: (requestId: string, page: number, filters: ChargeFilters) =>
    [...chargeKeys.all(requestId), "list", { page, ...filters }] as const,
  detail: (requestId: string, chargeId: number) =>
    [...chargeKeys.all(requestId), "detail", chargeId] as const,
};

/** One page of charges; `filters` are the *applied* ones, not the draft. */
export function useConsignmentCharges(
  requestId: string,
  page: number,
  filters: ChargeFilters,
) {
  return useQuery({
    queryKey: chargeKeys.list(requestId, page, filters),
    queryFn: ({ signal }) => listCharges({ requestId, page, filters, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * One charge, read fresh when a dialog opens. The list row seeds
 * `placeholderData`, so the dialog paints immediately with what is known.
 */
export function useConsignmentCharge(
  requestId: string,
  chargeId: number | undefined,
  placeholder?: ConsignmentCharge,
) {
  return useQuery({
    queryKey: chargeKeys.detail(requestId, chargeId ?? -1),
    queryFn: ({ signal }) => fetchCharge(requestId, chargeId as number, signal),
    enabled: typeof chargeId === "number",
    placeholderData: placeholder,
    staleTime: 0,
  });
}

export interface SaveChargeVariables {
  /** Absent for a create. */
  id?: number;
  input: ChargeInput;
}

/**
 * Create or update. A failure is reported by the dialog, which knows which
 * fields it renders — see `reportApiError`.
 */
export function useSaveConsignmentCharge(requestId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: SaveChargeVariables) =>
      id ? updateCharge(requestId, id, input) : createCharge(requestId, input),

    onSuccess: async (result, variables) => {
      toast.success(
        result.message?.trim() || (variables.id ? "Charge updated" : "Charge added"),
      );
      await queryClient.invalidateQueries({ queryKey: chargeKeys.all(requestId) });
    },
  });
}

export function useDeleteConsignmentCharge(requestId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chargeId: number) => deleteCharge(requestId, chargeId),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Charge deleted");
      await queryClient.invalidateQueries({ queryKey: chargeKeys.all(requestId) });
    },

    onError: (error) =>
      toast.error(
        isApiError(error) ? { title: "Could not delete charge", message: error.message } : error,
      ),
  });
}
