"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { buildCreatePayload, buildUpdatePayload } from "../mappers";
import type { ConsignmentFormValues } from "../schema";
import {
  createConsignmentRequest,
  deleteConsignmentRequest,
  updateConsignmentRequest,
} from "../services/consignment-request.service";
import type { ConsignmentRequestDetail, RateOption } from "../types";
import { consignmentRequestKeys } from "./query-keys";

/**
 * The three writes on a consignment request.
 *
 * They share a shape on purpose: each maps form values to a payload, echoes
 * the API's own success line, invalidates the `["consignment-requests"]`
 * prefix — which covers the list pages *and* every detail entry under it — and
 * lets a 422 fall through silently, because the form renders those inline.
 */

interface CreateArgs {
  /** The quote the user selected on the rate-check step. */
  rate: RateOption;
  packageType: string;
  values: ConsignmentFormValues;
}

export function useCreateConsignmentRequest() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rate, packageType, values }: CreateArgs) =>
      createConsignmentRequest(buildCreatePayload(rate, packageType, values)),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment request created");
      await queryClient.invalidateQueries({ queryKey: consignmentRequestKeys.all });
      router.push("/consignments/request");
    },

    onError: (error) => {
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}

interface UpdateArgs {
  id: number;
  values: ConsignmentFormValues;
  /** The stored record, for the routing codes an edit does not re-derive. */
  detail: ConsignmentRequestDetail;
}

export function useUpdateConsignmentRequest() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, values, detail }: UpdateArgs) =>
      updateConsignmentRequest(id, buildUpdatePayload(values, detail)),

    onSuccess: async (result, { id }) => {
      toast.success(result.message?.trim() || "Consignment request updated");
      await queryClient.invalidateQueries({ queryKey: consignmentRequestKeys.all });
      router.push(`/consignments/request/${id}`);
    },

    onError: (error) => {
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}

/**
 * Withdraws a request.
 *
 * The failure gets the server's own wording: a request the API refuses to
 * remove — one already approved or picked up — explains itself far better than
 * generic copy could.
 */
export function useDeleteConsignmentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteConsignmentRequest(id),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment request deleted");
      await queryClient.invalidateQueries({ queryKey: consignmentRequestKeys.all });
    },

    onError: (error) => {
      if (isApiError(error)) {
        toast.error({
          title: "Could not delete request",
          message: error.message,
        });
        return;
      }
      toast.error(error);
    },
  });
}
