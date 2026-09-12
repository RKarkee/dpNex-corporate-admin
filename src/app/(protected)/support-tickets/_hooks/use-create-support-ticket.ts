"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { buildCreatePayload } from "../mappers";
import type { TicketFormValues } from "../schema";
import { createSupportTicket } from "../services/support-ticket.service";
import { supportTicketKeys } from "./query-keys";

/**
 * Raises a ticket.
 *
 * Echoes the API's own success line and invalidates the whole feature prefix —
 * the new ticket can land on any page under any filter, so nothing narrower is
 * safe. A 422 falls through silently, because the dialog renders those against
 * its own fields.
 */
export function useCreateSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (values: TicketFormValues) =>
      createSupportTicket(buildCreatePayload(values)),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Support ticket raised");
      await queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },

    onError: (error) => {
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}
