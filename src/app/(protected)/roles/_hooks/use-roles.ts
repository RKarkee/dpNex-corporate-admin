"use client";

import { useRouter } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import type { MutationResult } from "@/shared/api/http/create-client";
import {
  createRole,
  deleteRole,
  fetchPermissionGroups,
  fetchRole,
  fetchRoles,
  updateRole,
  type RoleInput,
  type RoleListParams,
} from "@/app/(protected)/roles/services/role.service";
import { hydratePermissions } from "@/shared/api/services/auth.service";
import { toast } from "@/shared/components/toast";

/**
 * Query keys, in one place so an invalidation cannot miss a cache by typo.
 * `all` is the prefix every other key starts with, so invalidating it clears
 * lists and details together.
 */
export const roleKeys = {
  all: ["roles"] as const,
  lists: () => [...roleKeys.all, "list"] as const,
  list: (params: RoleListParams) => [...roleKeys.lists(), params] as const,
  details: () => [...roleKeys.all, "detail"] as const,
  detail: (id: number) => [...roleKeys.details(), id] as const,
  permissions: () => ["permissions"] as const,
};

/* -------------------------------------------------------------------------- */
/* Reads                                                                      */
/* -------------------------------------------------------------------------- */

export function useRoles(params: RoleListParams) {
  return useQuery({
    queryKey: roleKeys.list(params),
    queryFn: ({ signal }) => fetchRoles(params, signal),
    // Keeps the previous page on screen while the next one loads, so paging
    // dims the table instead of collapsing it to a spinner and back.
    placeholderData: keepPreviousData,
  });
}

export function useRole(id: number | undefined) {
  return useQuery({
    queryKey: roleKeys.detail(id ?? 0),
    queryFn: ({ signal }) => fetchRole(id as number, signal),
    enabled: typeof id === "number" && Number.isFinite(id),

    // Same reasoning as `useUser`: opening a detail or edit page must ask the
    // server, not replay a copy the app-wide `staleTime: 60_000` is still
    // holding. The edit form writes this record back, so a stale seed here
    // means saving whatever was true a minute ago.
    staleTime: 0,
    refetchOnMount: "always",
  });
}

/** The full permission catalogue. Changes on deploy, not during a session. */
export function usePermissionGroups() {
  return useQuery({
    queryKey: roleKeys.permissions(),
    queryFn: ({ signal }) => fetchPermissionGroups(signal),
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
  });
}

/* -------------------------------------------------------------------------- */
/* Writes                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Editing a role can change what the *current* user is allowed to do — they
 * may hold the role they just edited. Re-reading `/me` keeps the sidebar and
 * page guards honest instead of waiting for the next full page load.
 */
function refreshOwnPermissions(): void {
  void hydratePermissions().catch(() => {});
}

/**
 * Prefer the API's wording, fall back to ours.
 *
 * The backend words each endpoint's success line itself ("Role created
 * successfully"), and echoing it means the toast cannot drift out of step with
 * what the server actually did. The fallback covers endpoints that return
 * `204 No Content` or omit the field.
 */
function successMessage(result: MutationResult, fallback: string): string {
  return result.message?.trim() || fallback;
}

/**
 * Surfaces the API's error text.
 *
 * `ApiError.message` is already the upstream `message` for any 4xx — see
 * `preferredMessage()` in `errors.ts`, which trusts the server below 500 and
 * substitutes our own copy at 500+, where the body carries stack traces.
 *
 * A 422 additionally carries `fieldErrors`; those render inline on the form,
 * and the toast repeats the summary so a validation failure is noticed even
 * when the offending field is scrolled out of view.
 */
function toastApiError(error: unknown, title?: string): void {
  if (!isApiError(error)) {
    toast.error(error);
    return;
  }

  const fields = error.fieldErrors
    ? Object.values(error.fieldErrors).flat()
    : [];

  // One bad field: show that message, it is more specific than the summary.
  const message = fields.length === 1 ? (fields[0] ?? error.message) : error.message;

  toast.error(title ? { title, message } : { message });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RoleInput) => createRole(input),
    onSuccess: async (result) => {
      toast.success(successMessage(result, "Role created"));
      await queryClient.invalidateQueries({ queryKey: roleKeys.all });
      router.push("/roles");
    },
    onError: (error) => toastApiError(error, "Could not create role"),
  });
}

export function useUpdateRole(id: number) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: RoleInput) => updateRole(id, input),
    onSuccess: async (result) => {
      toast.success(successMessage(result, "Role updated"));
      await queryClient.invalidateQueries({ queryKey: roleKeys.all });
      refreshOwnPermissions();
      router.push(`/roles/${id}`);
    },
    onError: (error) => toastApiError(error, "Could not save role"),
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: async (result) => {
      toast.success(successMessage(result, "Role deleted"));
      await queryClient.invalidateQueries({ queryKey: roleKeys.all });
      refreshOwnPermissions();
    },
    // A role still assigned to users cannot be removed; the API explains why
    // in its own words, and that beats any generic failure copy.
    onError: (error) => toastApiError(error, "Could not delete role"),
  });
}
