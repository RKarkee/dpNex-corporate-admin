"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/shared/components/toast";

import { locationKeys } from "../[id]/(detail)/locations/_hooks/use-consignment-locations";
import {
  assignConsignment,
  cancelConsignment,
  createConsignmentEvent,
  reassignConsignment,
  updateConsignmentReceiver,
  updateConsignmentSender,
  updateConsignmentStatus,
} from "../services/consignment-actions.service";
import type {
  AssignPayload,
  CancelPayload,
  CreateEventPayload,
  ReassignPayload,
  ConsignmentReceiver,
  ConsignmentSender,
  UpdateStatusPayload,
} from "../types";
import { consignmentAdminKeys } from "./query-keys";

/**
 * The workflow writes on one consignment.
 *
 * Each echoes the API's own success line and invalidates the feature root,
 * which covers the list (status, route and owner are all list columns) and
 * every entry under this consignment — the detail, whose events, assignment
 * history and Assign/Reassign button all move with these writes.
 *
 * None of them toasts a failure: the dialog that called knows which fields it
 * renders and reports through `reportApiError`, so each failure is shown once.
 */

function useInvalidateConsignment() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: consignmentAdminKeys.all });
}

/**
 * `updatestatus` — may also record a location, so the Locations tab is
 * refreshed too; from the tracking history's point of view a status update
 * with a place is indistinguishable from a scan.
 */
export function useUpdateConsignmentStatus(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateConsignment();

  return useMutation({
    mutationFn: (input: UpdateStatusPayload) => updateConsignmentStatus(id, input),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Status updated");
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: locationKeys.all(String(id)) }),
      ]);
    },
  });
}

export function useUpdateConsignmentSender(id: number) {
  const invalidate = useInvalidateConsignment();

  return useMutation({
    mutationFn: (sender: ConsignmentSender) => updateConsignmentSender(id, sender),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Sender updated");
      await invalidate();
    },
  });
}

export function useUpdateConsignmentReceiver(id: number) {
  const invalidate = useInvalidateConsignment();

  return useMutation({
    mutationFn: (receiver: ConsignmentReceiver) => updateConsignmentReceiver(id, receiver),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Receiver updated");
      await invalidate();
    },
  });
}

export function useCreateConsignmentEvent(id: number) {
  const invalidate = useInvalidateConsignment();

  return useMutation({
    mutationFn: (payload: CreateEventPayload) => createConsignmentEvent(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Event created");
      await invalidate();
    },
  });
}

export function useAssignConsignment(id: number) {
  const invalidate = useInvalidateConsignment();

  return useMutation({
    mutationFn: (payload: AssignPayload) => assignConsignment(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Assigned");
      await invalidate();
    },
  });
}

export function useReassignConsignment(id: number) {
  const invalidate = useInvalidateConsignment();

  return useMutation({
    mutationFn: (payload: ReassignPayload) => reassignConsignment(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Reassigned");
      await invalidate();
    },
  });
}

/**
 * `cancel` — the status moves, an event is logged and the actions on offer
 * change, so the whole consignment is refreshed, and its Locations tab too.
 */
export function useCancelConsignment(id: number) {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateConsignment();

  return useMutation({
    mutationFn: (payload: CancelPayload) => cancelConsignment(id, payload),
    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment cancelled");
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: locationKeys.all(String(id)) }),
      ]);
    },
  });
}
