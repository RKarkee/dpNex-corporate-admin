"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { buildCreatePayload } from "../mappers";
import type { PickupFormValues } from "../schema";
import { createPickupRequest } from "../services/pickup-request.service";
import { pickupRequestKeys } from "./query-keys";

/**
 * Books a pickup.
 *
 * Invalidates the whole feature prefix — a new booking lands on page one and
 * shifts every page after it — and lets a 422 fall through silently, because
 * the dialog renders the server's reason next to the picker it belongs to.
 */
export function useCreatePickupRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: PickupFormValues) =>
      createPickupRequest(buildCreatePayload(values)),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Pickup requested");
      await queryClient.invalidateQueries({ queryKey: pickupRequestKeys.all });
    },

    onError: (error) => {
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}
