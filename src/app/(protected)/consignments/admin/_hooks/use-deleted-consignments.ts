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
  listDeletedConsignments,
  restoreConsignment,
} from "../services/consignment-admin.service";
import { consignmentAdminKeys } from "./query-keys";

/**
 * One page of the landing page's Deleted tab.
 *
 * `keepPreviousData` keeps the rows on screen while the next page loads, the
 * same way the main list does.
 */
export function useDeletedConsignments(page: number, perPage = 15) {
  return useQuery({
    queryKey: consignmentAdminKeys.deleted({ page, perPage }),
    queryFn: ({ signal }) =>
      listDeletedConsignments({ page, perPage, signal }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Restores a deleted consignment. Invalidating the feature root refreshes both
 * tabs — the row leaves Deleted and rejoins the main list.
 */
export function useRestoreConsignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => restoreConsignment(id),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Consignment restored");
      await queryClient.invalidateQueries({ queryKey: consignmentAdminKeys.all });
    },

    onError: (error) => {
      toast.error(
        isApiError(error)
          ? { title: "Could not restore consignment", message: error.message }
          : error,
      );
    },
  });
}
