"use client";

import * as React from "react";

import { RequirePermission } from "@/shared/auth/require-permission";

import { RoleForm } from "../../_components/role-form";
import { RoleNotFound } from "../../_components/role-not-found";
import { useRole, useUpdateRole } from "../../_hooks/use-roles";

export default function EditRolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const roleId = Number(id);

  const roleQuery = useRole(Number.isFinite(roleId) ? roleId : undefined);
  const updateRole = useUpdateRole(roleId);

  if (!Number.isFinite(roleId) || (roleQuery.isError && !roleQuery.data)) {
    return <RoleNotFound />;
  }

  return (
    <RequirePermission permission="edit_role">
      <RoleForm
        mode="edit"
        role={roleQuery.data}
        loading={roleQuery.isLoading}
        submitting={updateRole.isPending}
        error={updateRole.error}
        onSubmit={updateRole.mutate}
        cancelHref={`/roles/${roleId}`}
      />
    </RequirePermission>
  );
}
