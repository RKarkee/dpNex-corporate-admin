"use client";

import { useMutation } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { checkRates } from "../services/consignment-request.service";
import type { CheckRatesPayload } from "../types";

/**
 * Fetches quotes for a destination and weight.
 *
 * A mutation rather than a query even though it only reads: it runs when the
 * user submits, not when the page mounts, and it must be re-runnable with the
 * same inputs — a query would serve the cached answer and look like nothing
 * happened.
 *
 * `data` holds the last result, so the page reads the rates straight off the
 * mutation rather than mirroring them into state.
 */
export function useCheckRates() {
  return useMutation({
    mutationFn: (payload: CheckRatesPayload) => checkRates(payload),

    onError: (error) => {
      // A 422 is already spelled out field by field under the inputs.
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}
