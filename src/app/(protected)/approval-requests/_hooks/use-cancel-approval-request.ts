"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { cancelApprovalRequest } from "../services/approval-request.service";
import { approvalRequestKeys } from "./query-keys";

/**
 * Withdraws a pending request.
 *
 * Nothing is removed or rewritten optimistically: the record survives as
 * CANCELLED and stays in the list, and the server decides whether the
 * withdrawal was still allowed — a request reviewed a second ago is not.
 * Invalidating the feature prefix refreshes the row and the detail together.
 *
 * The failure keeps the server's own wording, which explains a refusal far
 * better than generic copy could.
 */
export function useCancelApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => cancelApprovalRequest(id),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Request withdrawn");
      await queryClient.invalidateQueries({ queryKey: approvalRequestKeys.all });
    },

    onError: (error) => {
      if (isApiError(error)) {
        toast.error({
          title: "Could not withdraw request",
          message: error.message,
        });
        return;
      }
      toast.error(error);
    },
  });
}
