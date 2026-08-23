"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchBox,
  fetchItem,
  listBoxes,
  listItems,
} from "../services/boxes.service";
import { consignmentAdminKeys } from "../../../../_hooks/query-keys";

/**
 * Boxes and items on the consignment detail page — **reads only**.
 *
 * An accepted consignment's contents are a record of what was shipped, not a
 * working draft: they are composed and corrected on the request before it is
 * accepted. So this tab lists boxes, expands them to their items, and opens
 * either as a details dialog. Nothing here writes.
 *
 * That is the one substantive difference from the request module's boxes tab,
 * which owns the same four reads plus create, update and delete. The write
 * paths are absent rather than permission-gated — a mutation that can never be
 * reached is a maintenance cost with no user.
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
    queryKey: [
      ...consignmentAdminKeys.boxes(consignmentId),
      { page, perPage },
    ] as const,
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
    queryKey: consignmentAdminKeys.box(consignmentId, boxId ?? "none"),
    queryFn: ({ signal }) => fetchBox(consignmentId, boxId as number, signal),
    enabled: Boolean(consignmentId) && Boolean(boxId),
  });
}

export function useBoxItems(
  consignmentId: number | string,
  boxId: number | undefined,
) {
  return useQuery({
    queryKey: consignmentAdminKeys.items(consignmentId, boxId ?? "none"),
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
    queryKey: consignmentAdminKeys.item(
      consignmentId,
      boxId ?? "none",
      itemId ?? "none",
    ),
    queryFn: ({ signal }) =>
      fetchItem(consignmentId, boxId as number, itemId as number, signal),
    enabled: Boolean(consignmentId) && Boolean(boxId) && Boolean(itemId),
  });
}
