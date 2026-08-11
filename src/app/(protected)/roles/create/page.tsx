"use client";

import { RequirePermission } from "@/shared/auth/require-permission";

import { RoleForm } from "../_components/role-form";
import { useCreateRole } from "../_hooks/use-roles";

export default function CreateRolePage() {
  const createRole = useCreateRole();

  return (
    <RequirePermission permission="create_role">
      <RoleForm
        mode="create"
        submitting={createRole.isPending}
        error={createRole.error}
        onSubmit={createRole.mutate}
        cancelHref="/roles"
      />
    </RequirePermission>
  );
}
