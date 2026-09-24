"use client";

import * as React from "react";
import { Ban, Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";

import { FieldShell } from "../../../../_components/field-shell";
import { reportApiError } from "../../../../_components/report-api-error";
import { useCancelConsignment } from "../../../../_hooks/use-consignment-actions";

/**
 * Cancel — `POST …/cancel` with `{ reason }`.
 *
 * The reason is recorded against the consignment and shown in its history, so it
 * is required: 3 to 500 characters, the API's own bounds, checked here first
 * so the user is not sent round the server for a length rule.
 */

const REASON_MIN = 3;
const REASON_MAX = 500;

export function CancelDialog({
  consignmentId,
  label,
  open,
  onOpenChange,
}: {
  consignmentId: number;
  /** The tracking id, so the user sees which consignment they are cancelling. */
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-destructive" aria-hidden />
            Cancel consignment
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{label}</span> will be
            cancelled. The reason is saved to its history.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <CancelForm consignmentId={consignmentId} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CancelForm({ consignmentId, onDone }: { consignmentId: number; onDone: () => void }) {
  const cancel = useCancelConsignment(consignmentId);

  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cancel.isPending) return;

    const text = reason.trim();
    if (text.length < REASON_MIN) {
      setError(`Reason must be at least ${REASON_MIN} characters`);
      return;
    }
    if (text.length > REASON_MAX) {
      setError(`Reason must be at most ${REASON_MAX} characters`);
      return;
    }

    cancel.mutate(
      { reason: text },
      {
        onSuccess: onDone,
        onError: (failure) =>
          reportApiError(failure, ["reason"], (_, message) => setError(message), "Could not cancel"),
      },
    );
  }

  const busy = cancel.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FieldShell
        label="Reason"
        required
        error={error}
        hint={`${reason.length}/${REASON_MAX}`}
      >
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            rows={4}
            maxLength={REASON_MAX}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setError(undefined);
            }}
            placeholder="Customer no longer needs the shipment"
            disabled={busy}
            aria-describedby={describedBy}
            aria-invalid={Boolean(error)}
          />
        )}
      </FieldShell>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Keep it
        </Button>
        <Button type="submit" variant="destructive" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Cancel consignment
        </Button>
      </DialogFooter>
    </form>
  );
}
