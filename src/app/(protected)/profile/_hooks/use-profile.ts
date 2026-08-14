"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast";
import { IS_DEV } from "@/shared/config/env";

import {
  createProfile,
  fetchProfile,
  updateProfile,
  type ProfilePayload,
} from "../services/profile.service";

/**
 * Key factory, matching `roleKeys` / `consignmentRequestKeys`.
 *
 * Scoped on purpose: a profile save invalidates only this tree, never the KYC
 * list, so saving a phone number does not re-download every document.
 */
export const profileKeys = {
  all: ["profile"] as const,
  detail: () => [...profileKeys.all, "detail"] as const,
};

/**
 * The signed-in user's customer profile.
 *
 * `data` is a `ProfileRead`, not a bare record, because the three outcomes need
 * different UI and must not be conflated:
 *
 *   found      → seed the form
 *   absent     → create mode, blue "Complete your profile" banner
 *   unreadable → render the same form, show a notice, hold back create
 *
 * A transport failure still lands in `isError`; that is a fourth case with its
 * own remedy (retry).
 */
export function useProfile() {
  return useQuery({
    queryKey: profileKeys.detail(),
    queryFn: ({ signal }) => fetchProfile(signal),
    // Same reasoning as `useUser`: the user navigates here to check or change
    // their own details, so a stale read is worse than a refetch.
    staleTime: 0,
    refetchOnMount: "always",
  });
}

/**
 * Create-or-update, decided by identity.
 *
 * `profileId` comes from the loaded record — never inferred from whether a
 * field looks empty. `undefined` means the API affirmatively reported no
 * profile, so this creates one. When the read was *unreadable* the form holds
 * Save back entirely, so a parse failure can never reach the create branch.
 *
 * The payload shape is not yet confirmed against the corporate validator: the
 * sibling portal's `POST /external/profile` answers 422, which proves the route
 * exists and the caller is authorised but says nothing about which fields it
 * wants. A 422 here is therefore an expected outcome rather than a surprise —
 * `fieldErrors` lands under the inputs and names exactly what to change.
 *
 * Deliberately **no `patchUser`**: `profile.name` is the *company* name, and
 * writing it into the session user would rename the person in the topbar.
 */
export function useSaveProfile(profileId: number | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfilePayload) =>
      profileId ? updateProfile(payload) : createProfile(payload),

    onSuccess: async (result) => {
      toast.success(result.message?.trim() || "Profile saved");
      await queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },

    onError: (error) => {
      // A 422 renders under each field; a toast on top would be noise and
      // would not say which field is wrong.
      if (isApiError(error) && error.isValidationError) {
        if (IS_DEV && typeof window !== "undefined") {
          console.debug("[profile] 422 field errors:", error.fieldErrors);
        }
        return;
      }

      toast.error(error);
    },
  });
}
