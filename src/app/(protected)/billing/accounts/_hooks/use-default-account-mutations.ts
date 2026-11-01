"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import {
  markBillingAccountPrimary,
  removePrimaryBillingAccount,
} from "../services/billing-account.service";
import { billingAccountKeys } from "./query-keys";

/**
 * Making an account the default, and clearing the default.
 *
 * Nothing is rewritten optimistically: which account ends up default is the
 * server's to decide. A refusal (422) is re-thrown for the confirm dialog to
 * show in place; only failures with nowhere else to go are toasted.
 */

function useInvalidateAccounts() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: billingAccountKeys.all });
}

function toastUnlessRefusal(error: unknown) {
  if (isApiError(error) && error.isValidationError) return;
  toast.error(error);
}

export function useMarkBillingAccountPrimary() {
  const invalidate = useInvalidateAccounts();

  return useMutation({
    mutationFn: (id: number | string) => markBillingAccountPrimary(id),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Default billing account updated");
      await invalidate();
    },
    onError: toastUnlessRefusal,
  });
}

export function useRemovePrimaryBillingAccount() {
  const invalidate = useInvalidateAccounts();

  return useMutation({
    mutationFn: () => removePrimaryBillingAccount(),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Default billing account removed");
      await invalidate();
    },
    onError: toastUnlessRefusal,
  });
}
