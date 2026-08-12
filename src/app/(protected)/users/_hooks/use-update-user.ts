"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import {
  assignRoles,
  updateUser,
  type UpdateUserInput,
} from "@/app/(protected)/users/services/users.service";
import { toast } from "@/shared/components/toast";

/** One save: the record itself, plus the roles when they actually changed. */
export interface UpdateUserVariables {
  fields: UpdateUserInput;
  roles: number[];
  /** Skips the `updateRoles` request when the selection is untouched. */
  rolesChanged: boolean;
}

/**
 * Saves a user, then routes to their detail page.
 *
 * Roles go to their own endpoint, as on create — but unlike create, a failure
 * there is **not** swallowed. There is no half-made record to protect here:
 * the user asked for one save, and reporting success while half of it was
 * refused would leave them believing a role change that never happened.
 */
export function useUpdateUser(id: number) {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fields, roles, rolesChanged }: UpdateUserVariables) => {
      const result = await updateUser(id, fields);
      if (rolesChanged) await assignRoles(id, roles);
      return result;
    },

    onSuccess: async (result) => {
      // The backend words each endpoint's success line itself; echoing it
      // keeps the toast in step with what the server actually did.
      toast.success(result.message?.trim() || "User updated");
      // Awaited so the detail page renders the saved values, not the cached ones.
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push(`/users/${id}`);
    },

    onError: (error) => {
      // A 422 is already spelled out field by field under the inputs.
      if (isApiError(error)) {
        if (error.isValidationError) return;
        toast.error({ title: "Could not save user", message: error.message });
        return;
      }
      toast.error(error);
    },
  });
}
