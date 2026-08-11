"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { UserForm, type UserFormValues } from "../../_components/user-form";
import { useUpdateUser } from "../../_hooks/use-update-user";
import { useUser } from "../../_hooks/use-user";
import { UserNotFound } from "../_components/user-not-found";

export default function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const userId = Number(id);
  const valid = Number.isFinite(userId);

  const query = useUser(valid ? userId : undefined);
  const updateUser = useUpdateUser(userId);

  function handleSubmit(values: UserFormValues) {
    updateUser.mutate({
      fields: {
        first_name: values.first_name,
        last_name: values.last_name,
        email: values.email,
        phone: values.phone,
        disabled: values.disabled,
        image: values.image,
      },
      roles: values.roles,
      // The form compares against what the record arrived with, so a name-only
      // edit does not spend a second request re-sending the same roles.
      rolesChanged: values.rolesChanged,
    });
  }

  if (!valid || (query.isError && !query.data)) return <UserNotFound />;

  return (
    <RequirePermission permission="edit_user">
      <PageHeader
        title="Edit user"
        description="Update this person's details, status and roles."
        actions={
          // The same control the detail page uses, rather than a bare text
          // link above the title — one way back from every user screen.
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href={`/users/${userId}`}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="max-w-3xl">
        <UserForm
          mode="edit"
          user={query.data}
          loading={query.isLoading}
          submitting={updateUser.isPending}
          error={updateUser.error}
          onSubmit={handleSubmit}
          cancelHref={`/users/${userId}`}
        />
      </div>
    </RequirePermission>
  );
}
