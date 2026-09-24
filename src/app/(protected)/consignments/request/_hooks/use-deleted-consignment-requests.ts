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
  listDeletedConsignmentRequests,
  restoreConsignmentRequest,
} from "../services/consignment-request.service";
import { consignmentRequestKeys } from "./query-keys";

/**
 * One page of the landing page's Deleted tab.
 *
 * `keepPreviousData` keeps the rows on screen while the next page loads, the
 * same way the main list does.
 */
export function useDeletedConsignmentRequests(page: number, perPage = 15) {
  return useQuery({
    queryKey: consignmentRequestKeys.deleted({ page, perPage }),
    queryFn: ({ signal }) =>
      listDeletedConsignmentRequests({ page, perPage, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Restores a deleted request. Invalidating the feature root refreshes both
 * tabs — the row leaves Deleted and rejoins the main list.
 */
export function useRestoreConsignmentRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => restoreConsignmentRequest(id),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment request restored");
      await queryClient.invalidateQueries({ queryKey: consignmentRequestKeys.all });
    },

    onError: (error) => {
      toast.error(
        isApiError(error)
          ? { title: "Could not restore request", message: error.message }
          : error,
      );
    },
  });
}
