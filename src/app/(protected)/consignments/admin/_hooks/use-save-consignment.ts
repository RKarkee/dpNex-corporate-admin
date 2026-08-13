"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { buildCreatePayload, buildUpdatePayload } from "../mappers";
import type { ConsignmentAdminFormValues } from "../schema";
import {
  createConsignment,
  deleteConsignment,
  updateConsignment,
} from "../services/consignment-admin.service";
import type { ConsignmentDetail, RateOption } from "../types";
import { consignmentAdminKeys } from "./query-keys";

/**
 * The three writes on a consignment.
 *
 * They share a shape on purpose: each maps form values to a payload, echoes the
 * API's own success line, invalidates the feature root — which covers the list
 * pages *and* every record beneath it — and lets a 422 fall through silently,
 * because the form renders those inline.
 */

interface CreateArgs {
  /** The quote the user selected on the rate-check step. */
  rate: RateOption;
  packageType: string;
  values: ConsignmentAdminFormValues;
}

export function useCreateConsignment() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rate, packageType, values }: CreateArgs) =>
      createConsignment(buildCreatePayload(rate, packageType, values)),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment created");
      await queryClient.invalidateQueries({
        queryKey: consignmentAdminKeys.all,
      });
      router.push("/consignments/admin");
    },

    onError: (error) => {
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}

interface UpdateArgs {
  id: number;
  values: ConsignmentAdminFormValues;
  /** The stored record, for the routing codes an edit does not re-derive. */
  detail: ConsignmentDetail;
}

export function useUpdateConsignment() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values, detail }: UpdateArgs) =>
      updateConsignment(id, buildUpdatePayload(values, detail)),

    onSuccess: async (result, { id }) => {
      toast.success(result.message?.trim() || "Consignment updated");
      await queryClient.invalidateQueries({
        queryKey: consignmentAdminKeys.all,
      });
      router.push(`/consignments/admin/${id}`);
    },

    onError: (error) => {
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}

/**
 * Removes a consignment.
 *
 * The failure gets the server's own wording: one the API refuses to delete —
 * already collected, in transit, or invoiced — explains itself far better than
 * generic copy could.
 */
export function useDeleteConsignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteConsignment(id),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment deleted");
      await queryClient.invalidateQueries({
        queryKey: consignmentAdminKeys.all,
      });
    },

    onError: (error) => {
      if (isApiError(error)) {
        toast.error({
          title: "Could not delete consignment",
          message: error.message,
        });
        return;
      }
      toast.error(error);
    },
  });
}
