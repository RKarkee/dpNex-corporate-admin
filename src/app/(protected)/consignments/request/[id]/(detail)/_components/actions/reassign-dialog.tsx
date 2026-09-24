"use client";

import * as React from "react";
import { Loader2, UserCog } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
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
import { assignableFetcher } from "../../../../_components/lookup-fetchers";
import { reportApiError } from "../../../../_components/report-api-error";
import { useReassignRequest } from "../../../../_hooks/use-consignment-actions";
import type { WorkflowPerson } from "../../../../types";
import { personName } from "../overview/person-name";

/**
 * Reassign — `POST …/reassign` with `{ assigned_to, reason }`, offered once
 * someone holds the request. Handing it to the person who already has it is
 * refused here rather than round-tripped.
 */

type Field = "assigned_to" | "reason";

export function ReassignDialog({
  requestId,
  currentAssigneeId,
  currentAssignee,
  open,
  onOpenChange,
}: {
  requestId: number;
  currentAssigneeId: number | null;
  /** Shown for context — whoever holds it now. */
  currentAssignee?: WorkflowPerson | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="size-5 text-primary" aria-hidden />
            Reassign
          </DialogTitle>
          <DialogDescription>
            {currentAssignee ? (
              <>
                Currently with{" "}
                <span className="font-medium text-foreground">
                  {personName(currentAssignee)}
                </span>
                .
              </>
            ) : (
              "Move this request to another user."
            )}
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <ReassignForm
            requestId={requestId}
            currentAssigneeId={currentAssigneeId}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ReassignForm({
  requestId,
  currentAssigneeId,
  onDone,
}: {
  requestId: number;
  currentAssigneeId: number | null;
  onDone: () => void;
}) {
  const reassign = useReassignRequest(requestId);

  const [assignee, setAssignee] = React.useState({ value: "", label: "" });
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reassign.isPending) return;

    const next: Partial<Record<Field, string>> = {};
    if (!assignee.value) next.assigned_to = "New assignee is required";
    else if (currentAssigneeId !== null && Number(assignee.value) === currentAssigneeId) {
      next.assigned_to = "Pick someone other than the current assignee";
    }
    if (!reason.trim()) next.reason = "Reason is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    reassign.mutate(
      { assigned_to: Number(assignee.value), reason: reason.trim() },
      {
        onSuccess: onDone,
        onError: (error) =>
          reportApiError<Field>(
            error,
            ["assigned_to", "reason"],
            (field, message) => setErrors((current) => ({ ...current, [field]: message })),
            "Could not reassign",
          ),
      },
    );
  }

  const busy = reassign.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FieldShell label="Reassign to" required error={errors.assigned_to}>
        {() => (
          <AsyncCombobox
            value={assignee.value}
            selectedLabel={assignee.label || undefined}
            onChange={(option) => {
              setAssignee(option);
              setErrors((current) => ({ ...current, assigned_to: undefined }));
            }}
            fetchPage={assignableFetcher}
            placeholder="Select a user"
            searchPlaceholder="Search users…"
            allowCustomValue={false}
            disabled={busy}
            aria-invalid={Boolean(errors.assigned_to)}
          />
        )}
      </FieldShell>

      <FieldShell label="Reason" required error={errors.reason}>
        {({ id }) => (
          <Textarea
            id={id}
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Another user on leave"
            disabled={busy}
            aria-invalid={Boolean(errors.reason)}
          />
        )}
      </FieldShell>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Reassign
        </Button>
      </DialogFooter>
    </form>
  );
}
