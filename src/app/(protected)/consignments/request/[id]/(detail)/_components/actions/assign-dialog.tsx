"use client";

import * as React from "react";
import { Loader2, UserPlus } from "lucide-react";

import { AsyncCombobox } from "@/shared/components/ui/async-combobox";
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
import { assignableFetcher } from "../../../../_components/lookup-fetchers";
import { reportApiError } from "../../../../_components/report-api-error";
import { useAssignRequest } from "../../../../_hooks/use-consignment-actions";

/**
 * Assign — `POST …/assign` with `{ task_code, assigned_to }`, offered while
 * nobody holds the request (`current_assignee_id` is null).
 *
 * Tasks come from `/meta`'s `consignment_request_task_codes`; people from the
 * assignables list scoped to this module, searched as the user types.
 */

type Field = "task_code" | "assigned_to";

export function AssignDialog({
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
            <UserPlus className="size-5 text-primary" aria-hidden />
            Assign
          </DialogTitle>
          <DialogDescription>Hand a task on this request to a user.</DialogDescription>
        </DialogHeader>

        {open ? (
          <AssignForm requestId={requestId} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function AssignForm({ requestId, onDone }: { requestId: number; onDone: () => void }) {
  const { requestTaskCodeOptions, isPending: loadingMeta } = useMetaOptions();
  const assign = useAssignRequest(requestId);

  const [taskCode, setTaskCode] = React.useState("");
  const [assignee, setAssignee] = React.useState({ value: "", label: "" });
  const [errors, setErrors] = React.useState<Partial<Record<Field, string>>>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (assign.isPending) return;

    const next: Partial<Record<Field, string>> = {};
    if (!taskCode) next.task_code = "Task is required";
    if (!assignee.value) next.assigned_to = "Assignee is required";
    setErrors(next);
    if (Object.keys(next).length) return;

    assign.mutate(
      { task_code: taskCode, assigned_to: Number(assignee.value) },
      {
        onSuccess: onDone,
        onError: (error) =>
          reportApiError<Field>(
            error,
            ["task_code", "assigned_to"],
            (field, message) => setErrors((current) => ({ ...current, [field]: message })),
            "Could not assign",
          ),
      },
    );
  }

  const busy = assign.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FieldShell label="Task" required error={errors.task_code}>
        {() => (
          <Combobox
            options={requestTaskCodeOptions}
            value={taskCode}
            onChange={(value) => {
              setTaskCode(value);
              setErrors((current) => ({ ...current, task_code: undefined }));
            }}
            placeholder={loadingMeta ? "Loading tasks…" : "Select a task"}
            searchPlaceholder="Search tasks…"
            emptyText="No task codes are available."
            disabled={busy || loadingMeta}
            aria-invalid={Boolean(errors.task_code)}
          />
        )}
      </FieldShell>

      <FieldShell label="Assign to" required error={errors.assigned_to}>
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

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Assign
        </Button>
      </DialogFooter>
    </form>
  );
}
