"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { documentErrorsFromResponse } from "../_components/document-validation";
import {
  createDocument,
  DocumentFileRequiredError,
  fetchDocument,
  listDocuments,
  updateDocument,
  type DocumentFileSelection,
  type DocumentFileSlot,
  type DocumentInput,
} from "../services/documents.service";

/**
 * Query keys for one request's documents.
 *
 * Scoped by `consignmentId` so two consignment requests open in two tabs never
 * share a cache entry, and so invalidating one request's documents leaves the
 * other's alone.
 */
export const documentKeys = {
  all: (consignmentId: string) => ["consignment-documents", consignmentId] as const,
  list: (consignmentId: string, page: number, perPage: number) =>
    [...documentKeys.all(consignmentId), "list", { page, perPage }] as const,
  detail: (consignmentId: string, docId: number) =>
    [...documentKeys.all(consignmentId), "detail", docId] as const,
};

/**
 * One page of documents.
 *
 * `keepPreviousData` is what makes paging feel settled: the grid keeps the
 * cards it has while the next page is in flight, rather than collapsing to a
 * skeleton and back on every page change.
 */
export function useConsignmentDocuments(
  consignmentId: string,
  page: number,
  perPage = 10,
) {
  return useQuery({
    queryKey: documentKeys.list(consignmentId, page, perPage),
    queryFn: ({ signal }) =>
      listDocuments({ consignmentId, page, perPage, signal }),
    placeholderData: keepPreviousData,
    // The user opens this tab to check or change the paperwork, so a stale
    // read is worse than a refetch.
    staleTime: 0,
    refetchOnMount: "always",
  });
}

/**
 * One document, read fresh when a dialog opens.
 *
 * `enabled` is what makes this safe to call unconditionally from a dialog that
 * may have no document selected. The list row is passed as `placeholderData` so
 * the dialog paints immediately with what is known and fills in the file
 * references when the detail lands.
 */
export function useConsignmentDocument(
  consignmentId: string,
  docId: number | undefined,
  placeholder?: unknown,
) {
  return useQuery({
    queryKey: documentKeys.detail(consignmentId, docId ?? -1),
    queryFn: ({ signal }) => fetchDocument(consignmentId, docId as number, signal),
    enabled: typeof docId === "number",
    placeholderData: placeholder as never,
    staleTime: 0,
    refetchOnMount: "always",
  });
}

const SLOT_LABELS: Record<DocumentFileSlot, string> = {
  file: "the document file",
  front_file: "the front side",
  back_file: "the back side",
};

/**
 * Turns the guard's slot list into copy.
 *
 * On a create this is the ordinary "you have not picked a file yet" case. On an
 * edit it means a stored scan could not be re-downloaded, which the wording has
 * to cover without asserting which of the two happened.
 */
function fileRequiredMessage(slots: DocumentFileSlot[]): {
  title: string;
  message: string;
} {
  const names = slots.map((slot) => SLOT_LABELS[slot]);
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : (names[0] ?? "the document file");

  return {
    title: "A scan is missing",
    message: `This document still needs ${list}. Choose the file and save again.`,
  };
}

/** Shared error handling for the document writes. */
function handleDocumentError(error: unknown, fallbackTitle: string): void {
  if (error instanceof DocumentFileRequiredError) {
    const { title, message } = fileRequiredMessage(error.slots);
    toast.warning({ title, message });
    return;
  }

  toast.error(
    isApiError(error) ? { title: fallbackTitle, message: error.message } : error,
  );
}

export interface SaveDocumentVariables {
  /** Absent for a new document. */
  id?: number;
  input: DocumentInput;
  selection: DocumentFileSelection;
  /**
   * The scans currently on the record, for an update.
   *
   * Any slot the user did not touch is re-sent from these references, so
   * editing a text field needs no file picking. Required whenever `id` is set.
   */
  stored?: { file_path?: string | null; back_file_path?: string | null };
}

export function useSaveConsignmentDocument(consignmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    // `mutationFn` is async so a synchronous `DocumentFileRequiredError` thrown
    // by the guard becomes a rejected mutation rather than an exception
    // escaping into the caller's event handler.
    mutationFn: async ({ id, input, selection, stored }: SaveDocumentVariables) =>
      id
        ? updateDocument(consignmentId, id, input, selection, stored ?? {})
        : createDocument(consignmentId, input, selection),

    onSuccess: async (result, variables) => {
      toast.success(
        result.message?.trim() ||
          (variables.id ? "Document updated" : "Document uploaded"),
      );
      await queryClient.invalidateQueries({
        queryKey: documentKeys.all(consignmentId),
      });
    },

    // A failure the form can point at is rendered beside the field that caused
    // it (the caller's own `onError` writes it there), so no toast fires —
    // otherwise an oversized scan reports itself twice, once misleadingly.
    onError: (error, variables) => {
      const fieldErrors = documentErrorsFromResponse(
        error,
        variables.input.document_type,
      );
      if (Object.keys(fieldErrors).length) return;

      handleDocumentError(error, "Could not save document");
    },
  });
}

