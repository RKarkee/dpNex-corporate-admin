"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { kycErrorsFromResponse } from "../_components/kyc-validation";
import {
  createKycDocument,
  deleteKycDocument,
  fetchKycDocuments,
  KycFileRequiredError,
  updateKycDocument,
  type KycDocumentInput,
  type KycFileSelection,
  type KycFileSlot,
} from "../services/kyc.service";

export const kycKeys = {
  all: ["kyc-documents"] as const,
  lists: () => [...kycKeys.all, "list"] as const,
  detail: (id: number) => [...kycKeys.all, "detail", id] as const,
};

export function useKycDocuments() {
  return useQuery({
    queryKey: kycKeys.lists(),
    queryFn: ({ signal }) => fetchKycDocuments(signal),
    staleTime: 0,
    refetchOnMount: "always",
  });
}

const SLOT_LABELS: Record<KycFileSlot, string> = {
  file: "the document file",
  front_file: "the front side",
  back_file: "the back side",
};

/**
 * Turns the guard's slot list into copy.
 *
 * Deliberately not "Service unavailable" — nothing is down, and saying so would
 * be false. The message names the actual requirement instead, and names which
 * side is missing so a two-sided document is unambiguous.
 */
function fileRequiredMessage(slots: KycFileSlot[]): {
  title: string;
  message: string;
} {
  const names = slots.map((slot) => SLOT_LABELS[slot]);
  const list =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
      : (names[0] ?? "the document file");

  return {
    title: "Re-upload required",
    message: `Saving this document requires ${list} to be uploaded again. Select the file before saving.`,
  };
}

/** Shared error handling for all three KYC writes. */
function handleKycError(error: unknown, fallbackTitle: string): void {
  if (error instanceof KycFileRequiredError) {
    const { title, message } = fileRequiredMessage(error.slots);
    toast.warning({ title, message });
    return;
  }

  toast.error(
    isApiError(error)
      ? { title: fallbackTitle, message: error.message }
      : error,
  );
}

export interface SaveKycVariables {
  /** Absent for a new document. */
  id?: number;
  input: KycDocumentInput;
  selection: KycFileSelection;
}

export function useSaveKycDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    // `mutationFn` is async so a synchronous `KycFileRequiredError` thrown by
    // the guard becomes a rejected mutation rather than an exception escaping
    // into the caller's event handler.
    mutationFn: async ({ id, input, selection }: SaveKycVariables) =>
      id
        ? updateKycDocument(id, input, selection)
        : createKycDocument(input, selection),

    onSuccess: async (result, variables) => {
      toast.success(
        result.message?.trim() ||
          (variables.id ? "Document updated" : "Document uploaded"),
      );
      await queryClient.invalidateQueries({ queryKey: kycKeys.all });
    },

    // A failure the form can point at is rendered beside the field that caused
    // it (the caller's own `onError` writes it there), so no toast fires —
    // otherwise an oversized scan reports itself twice, once misleadingly.
    onError: (error, variables) => {
      const fieldErrors = kycErrorsFromResponse(
        error,
        variables.input.document_type,
      );
      if (Object.keys(fieldErrors).length) return;

      handleKycError(error, "Could not save document");
    },
  });
}

export function useDeleteKycDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteKycDocument(id),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Document deleted");
      await queryClient.invalidateQueries({ queryKey: kycKeys.all });
    },

    onError: (error) => handleKycError(error, "Could not delete document"),
  });
}
