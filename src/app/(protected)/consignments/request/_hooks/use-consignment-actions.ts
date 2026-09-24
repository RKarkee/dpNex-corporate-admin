"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/shared/components/toast";

import { locationKeys } from "../[id]/(detail)/locations/_hooks/use-consignment-locations";
import {
  assignRequest,
  cancelRequest,
  createRequestEvent,
  reassignRequest,
  updateRequestReceiver,
  updateRequestSender,
  updateRequestStatus,
} from "../services/consignment-actions.service";
import type {
  AssignPayload,
  CancelPayload,
  CreateEventPayload,
  ReassignPayload,
  ReceiverInfo,
  SenderInfo,
  UpdateStatusPayload,
} from "../types";
import { consignmentRequestKeys } from "./query-keys";

/**
 * The workflow writes on one consignment request.
 *
 * Each echoes the API's own success line and invalidates the feature root,
 * which covers the list (status, route and owner are all list columns) and
 * every entry under this request — the detail, whose events, assignment
 * history and Assign/Reassign button all move with these writes.
 *
 * None of them toasts a failure: the dialog that called knows which fields it
 * renders and reports through `reportApiError`, so each failure is shown once.
 */

function useInvalidateRequest() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: consignmentRequestKeys.all });
}

/**
 * `updatestatus` — may also record a location, so the Locations tab is
 * refreshed too; from the tracking history's point of view a status update
 * with a place is indistinguishable from a scan.
 */
export function useUpdateRequestStatus(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRequest();

  return useMutation({
    mutationFn: (input: UpdateStatusPayload) => updateRequestStatus(id, input),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Status updated");
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: locationKeys.all(String(id)) }),
      ]);
    },
  });
}

export function useUpdateRequestSender(id: number) {
  const invalidate = useInvalidateRequest();

  return useMutation({
    mutationFn: (sender: SenderInfo) => updateRequestSender(id, sender),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Sender updated");
      await invalidate();
    },
  });
}

export function useUpdateRequestReceiver(id: number) {
  const invalidate = useInvalidateRequest();

  return useMutation({
    mutationFn: (receiver: ReceiverInfo) => updateRequestReceiver(id, receiver),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Receiver updated");
      await invalidate();
    },
  });
}

export function useCreateRequestEvent(id: number) {
  const invalidate = useInvalidateRequest();

  return useMutation({
    mutationFn: (payload: CreateEventPayload) => createRequestEvent(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Event created");
      await invalidate();
    },
  });
}

export function useAssignRequest(id: number) {
  const invalidate = useInvalidateRequest();

  return useMutation({
    mutationFn: (payload: AssignPayload) => assignRequest(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Assigned");
      await invalidate();
    },
  });
}

export function useReassignRequest(id: number) {
  const invalidate = useInvalidateRequest();

  return useMutation({
    mutationFn: (payload: ReassignPayload) => reassignRequest(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Reassigned");
      await invalidate();
    },
  });
}

/**
 * `cancel` — the status moves, an event is logged and the actions on offer
 * change, so the whole request is refreshed; the Locations tab too, since a
 * cancellation is a status change on the tracking history.
 */
export function useCancelRequest(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateRequest();

  return useMutation({
    mutationFn: (payload: CancelPayload) => cancelRequest(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment request cancelled");
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: locationKeys.all(String(id)) }),
      ]);
    },
  });
}
