"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import {
  replyToSupportTicket,
  type ReplyPayload,
} from "../services/support-ticket.service";
import { supportTicketKeys } from "./query-keys";

/**
 * Posts a reply to a ticket.
 *
 * The response shape is undocumented and the write has side effects on the
 * record — the server stamps `first_responded_at`, and a reply can move a
 * ticket's status — so nothing is seeded from what comes back. Invalidating the
 * whole feature refetches the detail and the row together, and whatever the
 * server decided is what gets rendered.
 *
 * Re-thrown on failure so the composer keeps the text: retyping a paragraph
 * because a request timed out is the worst possible outcome here.
 */
export function useReplyToTicket(id: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReplyPayload) => replyToSupportTicket(id, payload),

    onSuccess: async (result, payload) => {
      toast.success(
        result.message?.trim() ||
          (payload.isInternal ? "Internal note added" : "Reply sent"),
      );
      await queryClient.invalidateQueries({ queryKey: supportTicketKeys.all });
    },

    onError: (error) => {
      // A 422 lands under the composer, where the text still is.
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}
