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
 * Query keys for one consignment's charges — scoped by `consignmentId`, so two
 * consignments open side by side never share an entry.
 */
export const chargeKeys = {
  all: (consignmentId: string) => ["corporate-consignment-charges", consignmentId] as const,
  list: (consignmentId: string, page: number, filters: ChargeFilters) =>
    [...chargeKeys.all(consignmentId), "list", { page, ...filters }] as const,
  detail: (consignmentId: string, chargeId: number) =>
    [...chargeKeys.all(consignmentId), "detail", chargeId] as const,
};

/** One page of charges; `filters` are the *applied* ones, not the draft. */
export function useConsignmentCharges(
  consignmentId: string,
  page: number,
  filters: ChargeFilters,
) {
  return useQuery({
    queryKey: chargeKeys.list(consignmentId, page, filters),
    queryFn: ({ signal }) => listCharges({ consignmentId, page, filters, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * One charge, read fresh when a dialog opens. The list row seeds
 * `placeholderData`, so the dialog paints immediately with what is known.
 */
export function useConsignmentCharge(
  consignmentId: string,
  chargeId: number | undefined,
  placeholder?: ConsignmentCharge,
) {
  return useQuery({
    queryKey: chargeKeys.detail(consignmentId, chargeId ?? -1),
    queryFn: ({ signal }) => fetchCharge(consignmentId, chargeId as number, signal),
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
export function useSaveConsignmentCharge(consignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: SaveChargeVariables) =>
      id ? updateCharge(consignmentId, id, input) : createCharge(consignmentId, input),

    onSuccess: async (result, variables) => {
      toast.success(
        result.message?.trim() || (variables.id ? "Charge updated" : "Charge added"),
      );
      await queryClient.invalidateQueries({ queryKey: chargeKeys.all(consignmentId) });
    },
  });
}

export function useDeleteConsignmentCharge(consignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (chargeId: number) => deleteCharge(consignmentId, chargeId),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Charge deleted");
      await queryClient.invalidateQueries({ queryKey: chargeKeys.all(consignmentId) });
    },

    onError: (error) =>
      toast.error(
        isApiError(error) ? { title: "Could not delete charge", message: error.message } : error,
      ),
  });
}
