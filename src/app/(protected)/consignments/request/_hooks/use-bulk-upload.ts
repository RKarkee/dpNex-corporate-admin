"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { toast } from "@/shared/components/toast";

import { downloadBlob } from "../_lib/download-file";
import {
  fetchBulkUploadBatch,
  fetchBulkUploadErrorReport,
  fetchBulkUploadRows,
  fetchBulkUploadTemplate,
  isBatchInProgress,
  uploadBulkConsignmentRequests,
} from "../services/bulk-upload.service";
import { consignmentRequestKeys } from "./query-keys";

/**
 * Bulk upload — the upload itself, the two file downloads, and one batch's
 * status and rows.
 *
 * The file calls are mutations: one-off actions whose answer is a file to save,
 * not something worth caching. Each saves the file and toasts its own failure,
 * so the components stay free of try/catch.
 */

/** How often a batch that is still processing re-checks its status. */
const IN_PROGRESS_POLL_MS = 5000;

/**
 * Uploads a file. New requests may now exist, so the list is refreshed; the
 * caller shows the outcome (a rejected file is spelled out under the upload).
 */
export function useUploadBulkConsignmentRequests() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (percent: number) => void }) =>
      uploadBulkConsignmentRequests(file, onProgress),

    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: consignmentRequestKeys.lists() });
    },
  });
}

/** Fetches and saves the blank template. */
export function useDownloadBulkUploadTemplate() {
  return useMutation({
    mutationFn: fetchBulkUploadTemplate,
    onSuccess: ({ blob, filename }) => downloadBlob(blob, filename),
    onError: (error) => toast.error(error),
  });
}

/** Fetches and saves one batch's error report. */
export function useDownloadBulkUploadErrorReport() {
  return useMutation({
    mutationFn: (batchCode: string) => fetchBulkUploadErrorReport(batchCode),
    onSuccess: ({ blob, filename }) => downloadBlob(blob, filename),
    onError: (error) => toast.error(error),
  });
}

/**
 * One batch's status — `GET bulk-upload/{batch_code}` (status, counts, …).
 * Idle until a batch code is asked about. While the batch is still processing
 * it re-checks every few seconds, and stops by itself once the status is final
 * (or the request fails).
 */
export function useBulkUploadBatch(batchCode: string | null) {
  return useQuery({
    queryKey: consignmentRequestKeys.bulkUploadStatus(batchCode ?? ""),
    queryFn: ({ signal }) => fetchBulkUploadBatch(batchCode as string, signal),
    enabled: Boolean(batchCode),
    retry: false,
    refetchInterval: (query) =>
      query.state.status === "success" && isBatchInProgress(query.state.data)
        ? IN_PROGRESS_POLL_MS
        : false,
  });
}

/**
 * A batch's rows, loaded page by page as the user scrolls
 * (`GET bulk-upload/{code}/rows?page=N`). Idle until a batch code is asked
 * about. The next page exists while `meta.page < meta.pageCount` and fewer
 * than `meta.total` rows are loaded; a response without `meta` is treated as
 * the only page.
 */
export function useBulkUploadRows(batchCode: string | null, perPage: number) {
  return useInfiniteQuery({
    queryKey: consignmentRequestKeys.bulkUploadRows(batchCode ?? "", { perPage }),
    queryFn: ({ pageParam, signal }) =>
      fetchBulkUploadRows(batchCode as string, pageParam, perPage, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      const meta = lastPage.meta;
      if (!meta || lastPage.rows.length === 0) return undefined;
      const loaded = allPages.reduce((sum, page) => sum + page.rows.length, 0);
      if (meta.total && loaded >= meta.total) return undefined;
      return meta.page < meta.pageCount ? meta.page + 1 : undefined;
    },
    enabled: Boolean(batchCode),
    retry: false,
  });
}
