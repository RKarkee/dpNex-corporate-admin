"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import {
  closeRefusalReason,
  closeSupportTicket,
} from "../services/support-ticket.service";
import { supportTicketKeys } from "./query-keys";

/**
 * Closes a resolved ticket.
 *
 * Nothing is rewritten optimistically: the API refuses anything that is not
 * RESOLVED, and the status it lands on is the server's to decide. The refusal
 * is a 422 carrying its reason under `errors.status`, which the caller renders
 * in place — so this hook re-throws instead of swallowing it, and only toasts
 * the failures that have nowhere else to go.
 */
export function useCloseSupportTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number | string) => closeSupportTicket(id),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Ticket closed");
      await queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },

    onError: (error) => {
      // A refusal is shown next to the button that caused it; a toast as well
      // would say the same thing twice.
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}

export { closeRefusalReason };
