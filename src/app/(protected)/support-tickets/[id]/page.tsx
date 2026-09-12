"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import {
  closeRefusalReason,
  useCloseSupportTicket,
} from "../_hooks/use-close-support-ticket";
import { useSupportTicket } from "../_hooks/use-support-ticket";
import { isClosable, isResolved } from "../types";
import {
  TicketDetail,
  TicketDetailSkeleton,
} from "./_components/ticket-detail";
import { TicketNotFound } from "./_components/ticket-not-found";

export default function SupportTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);

  const query = useSupportTicket(id);
  const ticket = query.data;

  const closeTicket = useCloseSupportTicket();
  const [confirming, setConfirming] = React.useState(false);
  const [closeError, setCloseError] = React.useState<string | null>(null);

  const closable = Boolean(ticket && isClosable(ticket));

  /**
   * The server is the authority on whether a close is allowed — it refuses with
   * its reason under `errors.status` ("Only a resolved ticket can be closed.").
   * Re-thrown so the dialog stays open and that sentence has somewhere to live,
   * next to the button that caused it.
   */
  const handleConfirm = async () => {
    if (!ticket) return;

    try {
      setCloseError(null);
      await closeTicket.mutateAsync(ticket.id);
    } catch (error) {
      setCloseError(
        closeRefusalReason(error) ?? "This ticket could not be closed.",
      );
      throw error;
    }
  };

  if (query.isError && !ticket) return <TicketNotFound />;

  return (
    <>
      <PageHeader
        title={ticket?.subject ?? "Support ticket"}
        description={
          ticket?.ticket_no
            ? `${ticket.ticket_no} · raised in your account`
            : "What was reported, and what has happened since."
        }
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/support-tickets">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            {/*
              Offered on anything not already closed, matching the admin
              console. Closing has no precondition this app can read — the
              server's rule may differ by caller and by workflow state — so
              disabling the button here meant guessing at a rule and hiding the
              action behind the guess. The dialog warns when no resolution is on
              record, and a refusal comes back with the server's own wording.
            */}
            {closable ? (
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => {
                  setCloseError(null);
                  setConfirming(true);
                }}
                disabled={closeTicket.isPending}
              >
                <CheckCircle2 className="size-4" />
                Close ticket
              </Button>
            ) : null}
          </>
        }
      />

      {query.isPending || !ticket ? (
        <TicketDetailSkeleton />
      ) : (
        <TicketDetail ticket={ticket} />
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Close this ticket?"
        tone="default"
        description={
          ticket ? (
            <>
              <span className="font-medium text-foreground">
                {ticket.ticket_no}
              </span>{" "}
              {/*
                Closing ends the window in which disagreeing with the
                resolution still means something, so the two cases are worded
                apart: one is the normal end of a ticket, the other is closing
                something nobody has answered.
              */}
              {isResolved(ticket)
                ? "will be marked closed. Closing ends your window to disagree with how it was resolved."
                : "has no resolution recorded yet. Normally support resolves a ticket first — closing it now ends the conversation, and the server may refuse."}
              {closeError ? (
                <span className="mt-2 block text-destructive">{closeError}</span>
              ) : null}
            </>
          ) : null
        }
        confirmLabel="Close ticket"
        onConfirm={handleConfirm}
      />
    </>
  );
}
