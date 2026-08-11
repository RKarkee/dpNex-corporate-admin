"use client";

import { UserForm, type UserFormValues } from "../../_components/user-form";
import { useCreateUser } from "../../_hooks/use-create-user";

/**
 * Wires the shared form to the create mutation.
 *
 * A client shell so `create/page.tsx` can stay a Server Component and keep its
 * `metadata` export — a page that called `useCreateUser()` itself could not.
 */
export function CreateUserForm() {
  const { mutate, isPending, error } = useCreateUser();

  function handleSubmit(values: UserFormValues) {
    mutate({
      first_name: values.first_name,
      last_name: values.last_name,
      email: values.email,
      phone: values.phone,
      password: values.password,
      password_confirmation: values.password_confirmation,
      disabled: values.disabled,
      roles: values.roles,
      image: values.image,
    });
  }

  return (
    <UserForm
      mode="create"
      submitting={isPending}
      error={error}
      onSubmit={handleSubmit}
      cancelHref="/users"
    />
  );
}
