"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import {
  assignRoles,
  createUser,
  type CreateUserInput,
} from "@/shared/api/services/users.service";
import { toast } from "@/shared/components/toast";

/**
 * Creates a user, then routes back to the directory.
 *
 * Roles are a second request — `/corporate/users/{id}/updateRoles` is its own
 * endpoint, not part of the create payload. It runs only when the create
 * response carried an id, and a failure there does **not** fail the mutation:
 * the account exists at that point, and telling the user the whole thing
 * failed would invite a duplicate submission. They get a warning instead, and
 * can assign roles from the directory.
 */
export function useCreateUser() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateUserInput) => {
      const created = await createUser(input);

      if (created?.id && input.roles.length > 0) {
        try {
          await assignRoles(created.id, input.roles);
        } catch {
          toast.warning({
            title: "User created, roles not assigned",
            message: "Assign their roles from the directory.",
          });
        }
      }

      return created;
    },

    onSuccess: () => {
      toast.success("User created");
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/users");
    },

    onError: (error) => {
      // A 422 is already spelled out field by field under the inputs; the
      // toast would just repeat it less usefully.
      if (isApiError(error) && error.isValidationError) return;
      toast.error(error);
    },
  });
}
