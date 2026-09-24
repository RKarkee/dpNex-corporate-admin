"use client";

import { ListChecks } from "lucide-react";

import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { formatDateTime } from "@/shared/lib/dates";

import type { AssignmentHistoryEntry } from "../../../../types";
import { personName } from "./person-name";

/**
 * Every workflow task this consignment has moved through — who held it, who
 * handed it over, and (once known) how long they took to see and respond.
 *
 * Read-only: assigning happens through the Assign / Reassign action. Newest
 * first, and the entry matching `current_assignment` is marked Current.
 */
export function AssignmentHistorySection({
  histories,
  currentAssignmentId,
}: {
  histories: AssignmentHistoryEntry[];
  currentAssignmentId?: number | null;
}) {
  const sorted = [...histories].sort((a, b) =>
    String(b.assigned_at ?? "").localeCompare(String(a.assigned_at ?? "")),
  );

  return (
    <Card className="p-6">
      <h2 className="mb-4 flex items-center gap-2 border-b border-border/70 pb-3 text-base font-semibold text-foreground">
        <ListChecks className="size-4 text-primary" aria-hidden />
        Assignment history ({histories.length})
      </h2>

      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assignment history yet.</p>
      ) : (
        <ul className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {sorted.map((entry) => (
            <AssignmentRow
              key={entry.id}
              entry={entry}
              current={currentAssignmentId === entry.id}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function AssignmentRow({
  entry,
  current,
}: {
  entry: AssignmentHistoryEntry;
  current: boolean;
}) {
  const state = entry.completed_at ? "Completed" : entry.seen_at ? "Seen" : "Pending";
  const variant: BadgeProps["variant"] =
    state === "Completed" ? "success" : state === "Seen" ? "secondary" : "warning";

  const durations = [
    ["Ack", entry.ack_duration],
    ["Response", entry.response_duration],
    ["Active work", entry.active_work_duration],
    ["Ownership", entry.ownership_duration],
  ].filter((pair): pair is [string, string] => Boolean(pair[1]));

  return (
    <li className="space-y-1 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">
            {entry.workflow_task_name || entry.workflow_task_code || "Task"}
          </span>
          {current ? <Badge>Current</Badge> : null}
          <Badge variant={variant}>{state}</Badge>
          {entry.assigned_role ? <Badge variant="outline">{entry.assigned_role}</Badge> : null}
        </div>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          {formatDateTime(entry.assigned_at)}
        </span>
      </div>

      <p className="text-sm text-muted-foreground">
        Assigned to {personName(entry.assigned_to)}
        {entry.assigned_by ? <> by {personName(entry.assigned_by)}</> : null}
      </p>

      {entry.remarks ? (
        <p className="break-words text-sm text-muted-foreground">{entry.remarks}</p>
      ) : null}

      {durations.length > 0 ? (
        <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5 text-xs text-muted-foreground">
          {durations.map(([label, value]) => (
            <span key={label}>
              {label}: <span className="text-foreground">{value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </li>
  );
}
