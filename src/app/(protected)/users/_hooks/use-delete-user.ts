"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";

import { deleteUser } from "@/app/(protected)/users/services/users.service";

/**
 * Removes a user, then refreshes the directory.
 *
 * Invalidating the bare `["users"]` prefix covers the table pages *and* the
 * stat cards (`["users", "stats"]`), which would otherwise keep reporting a
 * total that includes the row just deleted.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: number) => deleteUser(userId),

    onSuccess: async (result) => {
      // The backend words each endpoint's success line itself; echoing it keeps
      // the toast in step with what the server actually did.
      toast.success(result.message?.trim() || "User deleted");
      await queryClient.invalidateQueries({ queryKey: ["users"] });
    },

    // A user the API refuses to remove — one still attached to consignments —
    // gets an explanation in the server's own words, which beats generic copy.
    onError: (error) => {
      if (isApiError(error)) {
        toast.error({ title: "Could not delete user", message: error.message });
        return;
      }
      toast.error(error);
    },
  });
}
