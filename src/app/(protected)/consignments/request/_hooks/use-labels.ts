"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/shared/components/toast";

import {
  downloadLabelFile,
  fetchLabelHistory,
  fetchLabelOptions,
  produceLabel,
} from "../services/labels.service";
import type { ConsignmentRequestDetail, LabelHistoryItem, LabelOption } from "../types";
import {
  downloadBlob,
  openPendingTab,
  safeFileName,
  showBlobInTab,
} from "../_lib/download-file";
import { consignmentRequestKeys } from "./query-keys";

/**
 * Labels on one consignment request.
 *
 * The two reads are queries shared by the options card and the history card —
 * one key each, so one request each however many components ask.
 *
 * The file calls are mutations: one-off actions whose answer is a file to hand
 * to the browser, not something worth caching. Each saves or shows the file
 * and toasts its own failure, so the components stay free of try/catch.
 */

const isValidId = (id: number) => Number.isFinite(id) && id > 0;

export function useLabelOptions(id: number) {
  return useQuery({
    queryKey: consignmentRequestKeys.labelOptions(id),
    queryFn: ({ signal }) => fetchLabelOptions(id, signal),
    enabled: isValidId(id),
  });
}

export function useLabelHistory(id: number) {
  return useQuery({
    queryKey: consignmentRequestKeys.labelHistory(id),
    queryFn: ({ signal }) => fetchLabelHistory(id, signal),
    enabled: isValidId(id),
  });
}

/** The bits of a version needed to fetch and name its file. */
export type LabelRef = Pick<LabelHistoryItem, "id" | "version" | "file_name">;

/**
 * Where the request stands on labels, from the detail and the history
 * together.
 *
 * `isGenerated` trusts the detail's `is_label_generated` when it is true, but
 * a generated version in the history counts too — so Download and Regenerate
 * appear even if the detail response leaves the flag out.
 */
export function useLabelState(request: ConsignmentRequestDetail) {
  const history = useLabelHistory(request.id);
  const versions = history.data ?? [];

  const currentVersion = versions.find((label) => label.is_current);
  const current: LabelRef | undefined = currentVersion ?? request.current_label ?? undefined;
  const isGenerated =
    request.is_label_generated === true || versions.some((label) => label.generated);

  return { history, currentVersion, current, isGenerated };
}

/**
 * The name a freshly produced label is saved under. The response's own
 * filename is in `Content-Disposition`, which the private client does not
 * expose for blob calls — the tracking id is the recognisable part anyway.
 */
function producedFileName(trackingId: string, id: number): string {
  return safeFileName(`${trackingId || `request-${id}`}-label`, "pdf");
}

export interface ProduceLabelInput {
  option: LabelOption;
  /** True once a label exists — a fresh version rather than the first. */
  regenerate: boolean;
}

/**
 * Generate or regenerate one option's label. A PDF answer is saved straight
 * away; a JSON answer (a carrier acknowledging) is shown as its message.
 * Refreshes everything under the request — history, and the detail's
 * `is_label_generated` / `current_label` with it.
 */
export function useProduceLabel(id: number, trackingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ option, regenerate }: ProduceLabelInput) =>
      produceLabel(id, option, regenerate),
    onSuccess: async (result, { regenerate }) => {
      if (result.kind === "file") downloadBlob(result.blob, producedFileName(trackingId, id));
      const fallback = regenerate ? "Label regenerated" : "Label generated";
      toast.success(result.kind === "json" ? result.message?.trim() || fallback : fallback);
      await queryClient.invalidateQueries({ queryKey: consignmentRequestKeys.request(id) });
    },
    onError: (error) => toast.error(error),
  });
}

/**
 * View (new tab) or Download one stored version through
 * `/labels/{id}/download`. Shared by the options card's Download button and
 * the history table, so both fetch, name and report errors the same way.
 *
 * `busyId` is the version being fetched right now, for its spinner.
 */
export function useLabelFile(trackingId: string) {
  const mutation = useMutation({
    mutationFn: (label: LabelRef) => downloadLabelFile(label.id),
    onError: (error) => toast.error(error),
  });

  const fileNameOf = (label: LabelRef) =>
    label.file_name?.trim() ||
    safeFileName(`${trackingId || "label"}-v${label.version}`, "pdf");

  const download = (label: LabelRef) =>
    mutation.mutate(label, { onSuccess: (blob) => downloadBlob(blob, fileNameOf(label)) });

  const view = (label: LabelRef) => {
    // Must happen before the fetch — see `openPendingTab`.
    const tab = openPendingTab();
    mutation.mutate(label, {
      onSuccess: (blob) => showBlobInTab(tab, blob),
      onError: () => tab?.close(),
    });
  };

  const busyId = mutation.isPending ? (mutation.variables?.id ?? null) : null;

  return { view, download, busyId };
}
