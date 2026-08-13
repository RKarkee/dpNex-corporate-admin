"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import {
  createBoxes,
  createItems,
  deleteBox,
  deleteItem,
  fetchBox,
  fetchItem,
  listBoxes,
  listItems,
  updateBox,
  updateItem,
} from "../services/consignment-boxes.service";
import type { BoxWritePayload, ItemWritePayload } from "../types";
import { consignmentRequestKeys } from "./query-keys";

/**
 * Boxes and items on the detail page.
 *
 * Every write invalidates `consignmentRequestKeys.request(id)` — the whole
 * subtree for that request. That is wider than the table being edited, and
 * deliberately so: adding a box changes the box list, the request's own
 * `no_of_boxes` in the detail header, and the values the edit form would seed
 * from. Invalidating only the box list would leave the other two stale.
 */

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export function useConsignmentBoxes(
  consignmentId: number | string,
  page: number,
  perPage = 10,
) {
  return useQuery({
    queryKey: [...consignmentRequestKeys.boxes(consignmentId), { page, perPage }] as const,
    queryFn: ({ signal }) => listBoxes(consignmentId, page, perPage, signal),
    placeholderData: keepPreviousData,
    enabled: Boolean(consignmentId),
  });
}

/**
 * A single box, for the view and edit dialogs.
 *
 * `enabled` is what makes this lazy: the dialogs mount with `boxId` undefined
 * and the query stays idle until one is chosen.
 */
export function useConsignmentBox(
  consignmentId: number | string,
  boxId: number | undefined,
) {
  return useQuery({
    queryKey: consignmentRequestKeys.box(consignmentId, boxId ?? "none"),
    queryFn: ({ signal }) => fetchBox(consignmentId, boxId as number, signal),
    enabled: Boolean(consignmentId) && Boolean(boxId),
  });
}

export function useBoxItems(
  consignmentId: number | string,
  boxId: number | undefined,
) {
  return useQuery({
    queryKey: consignmentRequestKeys.items(consignmentId, boxId ?? "none"),
    queryFn: ({ signal }) =>
      listItems(consignmentId, boxId as number, 1, 50, signal),
    enabled: Boolean(consignmentId) && Boolean(boxId),
  });
}

export function useBoxItem(
  consignmentId: number | string,
  boxId: number | undefined,
  itemId: number | undefined,
) {
  return useQuery({
    queryKey: consignmentRequestKeys.item(
      consignmentId,
      boxId ?? "none",
      itemId ?? "none",
    ),
    queryFn: ({ signal }) =>
      fetchItem(consignmentId, boxId as number, itemId as number, signal),
    enabled: Boolean(consignmentId) && Boolean(boxId) && Boolean(itemId),
  });
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/** Shared error handling: 422s render on the dialog's own fields. */
function reportError(error: unknown, title: string) {
  if (isApiError(error) && error.isValidationError) return;
  if (isApiError(error)) {
    toast.error({ title, message: error.message });
    return;
  }
  toast.error(error);
}

export function useSaveBox(consignmentId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      boxId,
      payload,
    }: {
      /** Absent for a create; the endpoint takes a batch either way. */
      boxId?: number;
      payload: BoxWritePayload;
    }) =>
      boxId
        ? updateBox(consignmentId, boxId, payload)
        : createBoxes(consignmentId, [payload]),

    onSuccess: async (result, { boxId }) => {
      toast.success(
        result.message?.trim() || (boxId ? "Box updated" : "Box added"),
      );
      await queryClient.invalidateQueries({
        queryKey: consignmentRequestKeys.request(consignmentId),
      });
    },

    onError: (error) => reportError(error, "Could not save box"),
  });
}

export function useDeleteBox(consignmentId: number | string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (boxId: number) => deleteBox(consignmentId, boxId),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Box deleted");
      await queryClient.invalidateQueries({
        queryKey: consignmentRequestKeys.request(consignmentId),
      });
    },

    onError: (error) => reportError(error, "Could not delete box"),
  });
}

export function useSaveItem(consignmentId: number | string, boxId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId?: number;
      payload: ItemWritePayload;
    }) =>
      itemId
        ? updateItem(consignmentId, boxId, itemId, payload)
        : createItems(consignmentId, boxId, [payload]),

    onSuccess: async (result, { itemId }) => {
      toast.success(
        result.message?.trim() || (itemId ? "Item updated" : "Item added"),
      );
      await queryClient.invalidateQueries({
        queryKey: consignmentRequestKeys.request(consignmentId),
      });
    },

    onError: (error) => reportError(error, "Could not save item"),
  });
}

export function useDeleteItem(consignmentId: number | string, boxId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => deleteItem(consignmentId, boxId, itemId),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Item deleted");
      await queryClient.invalidateQueries({
        queryKey: consignmentRequestKeys.request(consignmentId),
      });
    },

    onError: (error) => reportError(error, "Could not delete item"),
  });
}
