"use client";

import * as React from "react";
import { Loader2, Zap } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Combobox } from "@/shared/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";

import { FieldShell } from "../../../../_components/field-shell";
import { reportApiError } from "../../../../_components/report-api-error";
import { useCreateRequestEvent } from "../../../../_hooks/use-consignment-actions";

/**
 * Create Event — `POST …/events` with `{ event_code }`.
 *
 * The codes come from `/meta`'s `consignment_request_event_codes`: the user
 * picks the label, the `event_code` is sent, and disabled codes are not
 * offered. The new entry shows up in the Overview's Events section once the
 * record refetches.
 */
export function CreateEventDialog({
  requestId,
  open,
  onOpenChange,
}: {
  requestId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="size-5 text-primary" aria-hidden />
            Create event
          </DialogTitle>
          <DialogDescription>Log an event against this request.</DialogDescription>
        </DialogHeader>

        {open ? (
          <CreateEventForm requestId={requestId} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CreateEventForm({
  requestId,
  onDone,
}: {
  requestId: number;
  onDone: () => void;
}) {
  const { requestEventCodeOptions, isPending: loadingMeta } = useMetaOptions();
  const createEvent = useCreateRequestEvent(requestId);

  const [eventCode, setEventCode] = React.useState("");
  const [error, setError] = React.useState<string>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (createEvent.isPending) return;

    if (!eventCode) {
      setError("Event is required");
      return;
    }

    createEvent.mutate(
      { event_code: eventCode },
      {
        onSuccess: onDone,
        onError: (failure) =>
          reportApiError(failure, ["event_code"], (_, message) => setError(message), "Could not create event"),
      },
    );
  }

  const busy = createEvent.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FieldShell label="Event" required error={error}>
        {() => (
          <Combobox
            options={requestEventCodeOptions}
            value={eventCode}
            onChange={(value) => {
              setEventCode(value);
              setError(undefined);
            }}
            placeholder={loadingMeta ? "Loading events…" : "Select an event"}
            searchPlaceholder="Search events…"
            emptyText="No event codes are available."
            disabled={busy || loadingMeta}
            aria-invalid={Boolean(error)}
          />
        )}
      </FieldShell>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || !eventCode}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Create event
        </Button>
      </DialogFooter>
    </form>
  );
}
