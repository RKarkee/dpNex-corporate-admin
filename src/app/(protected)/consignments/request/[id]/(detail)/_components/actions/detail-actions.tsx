"use client";

import * as React from "react";
import { Ban, RefreshCw, } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { UpdateStatusDialog } from "../../../../_components/update-status-dialog";
import { useConsignmentPermissions } from "../../../../_hooks/use-consignment-permissions";
import type { ConsignmentRequestDetail, WorkflowPerson } from "../../../../types";
import { AssignDialog } from "./assign-dialog";
import { CancelDialog } from "./cancel-dialog";
import { CreateEventDialog } from "./create-event-dialog";
import { ReassignDialog } from "./reassign-dialog";

type OpenDialog = "status" | "event" | "assign" | "reassign" | "cancel" | null;

/**
 * The action bar at the top of the Overview tab — the record's workflow
 * actions, with room for more as they arrive.
 *
 * - **Update Status** needs the record not to refuse a tracking/status change,
 *   somewhere to go (`next_statuses`), and the user's grant.
 * - **Create Event** and **Assign / Reassign** have no record flag or
 *   dedicated permission yet, so they are offered to anyone on this page and
 *   the API has the final say.
 * - Assign while nobody holds the request, Reassign once someone does.
 */
export function DetailActions({ request }: { request: ConsignmentRequestDetail }) {
  const [open, setOpen] = React.useState<OpenDialog>(null);
  const { canUpdateStatus } = useConsignmentPermissions();

  const statuses = request.next_statuses ?? [];

  const showUpdateStatus =
    // Only an explicit `false` closes it — a response without the flag is not
    // a refusal, and hiding the action on a missing key made it look unbuilt.
    request.can_update_tracking_status !== false && Array.isArray(statuses) && statuses.length > 0 && canUpdateStatus;

  const currentAssigneeId =
    typeof request.current_assignee_id === "number" ? request.current_assignee_id : null;
  // const isAssigned = currentAssigneeId !== null;

  // Cancel is offered until the request is cancelled. No flag is published for
  // it; an explicit `can_cancel: false`, should the API send one, also hides it.
  // const canCancel =
  //   request.can_cancel !== false && !/CANCEL/i.test(String(request.status ?? ""));

  const close = (next: boolean) => {
    if (!next) setOpen(null);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showUpdateStatus ? (
          <Button size="sm" onClick={() => setOpen("status")}>
            <RefreshCw className="size-4" aria-hidden />
            Update status
          </Button>
        ) : null}

        {/* <Button size="sm" onClick={() => setOpen("event")}>
          <Zap className="size-4" aria-hidden />
          Create event
        </Button> */}

        {/* {isAssigned ? (
          <Button size="sm" onClick={() => setOpen("reassign")}>
            <UserCog className="size-4" aria-hidden />
            Reassign
          </Button>
        ) : (
          <Button size="sm" onClick={() => setOpen("assign")}>
            <UserPlus className="size-4" aria-hidden />
            Assign
          </Button>
        )} */}

        {/* {canCancel ? ( */}
          <Button size="sm" variant="destructive" onClick={() => setOpen("cancel")}>
            <Ban className="size-4" aria-hidden />
            Cancel
          </Button>
        {/* ) : null} */}
      </div>

      {showUpdateStatus ? (
        <UpdateStatusDialog
          requestId={request.id}
          statuses={statuses}
          open={open === "status"}
          onOpenChange={close}
        />
      ) : null}
      <CreateEventDialog requestId={request.id} open={open === "event"} onOpenChange={close} />
      <AssignDialog requestId={request.id} open={open === "assign"} onOpenChange={close} />
      <ReassignDialog
        requestId={request.id}
        currentAssigneeId={currentAssigneeId}
        currentAssignee={
          request.current_assignment?.assigned_to ??
          (request.assigned_to as WorkflowPerson | null | undefined)
        }
        open={open === "reassign"}
        onOpenChange={close}
      />
      {/* {canCancel ? ( */}
        <CancelDialog
          requestId={request.id}
          label={request.request_tracking_id || `#${request.id}`}
          open={open === "cancel"}
          onOpenChange={close}
        />
      {/* ) : null} */}
    </>
  );
}
