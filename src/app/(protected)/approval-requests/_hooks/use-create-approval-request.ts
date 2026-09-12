"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { buildCreatePayload } from "../mappers";
import type { ApprovalFormValues } from "../schema";
import { createApprovalRequest } from "../services/approval-request.service";
import { approvalRequestKeys } from "./query-keys";

/**
 * Raises a request.
 *
 * Echoes the API's own success line, invalidates the whole feature prefix —
 * the new row can land on any page under any filter, so nothing narrower is
 * safe — and lets a 422 fall through silently, because the dialog renders
 * those against its own fields.
 */
export function useCreateApprovalRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: ApprovalFormValues) =>
      createApprovalRequest(buildCreatePayload(values)),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Request submitted for approval");
      await queryClient.invalidateQueries({ queryKey: approvalRequestKeys.all });
    },

    onError: (error) => {
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}
