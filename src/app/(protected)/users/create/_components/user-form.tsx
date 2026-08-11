"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { rolesQuery } from "@/shared/api/services/roles.service";
import type { YesNo } from "@/shared/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { useCreateUser } from "@/shared/hooks/use-create-user";

import {
  FormField,
  FormSection,
  FormSelect,
  PasswordField,
} from "./form-fields";
import { RolePicker } from "./role-picker";

/**
 * Add User.
 *
 * Uncontrolled — the fields live in the DOM and `FormData` reads them on
 * submit, the same pattern as the sign-in form. The two exceptions are the
 * role checkboxes, which need an array rather than a string, and the local
 * password-match error, which has no server round trip to hang off.
 *
 * There is no corporate field: `X-Corporate-Code` already scopes the request,
 * so the API decides which corporate the user joins, not this form.
 */

/** `user_type` on a corporate account. `ADM` belongs to the Super Admin portal. */
const USER_TYPES = [
  { value: "CRP", label: "Corporate" },
  { value: "INT", label: "Internal" },
  { value: "EXT", label: "External" },
];

const STATUSES: { value: YesNo; label: string }[] = [
  { value: "N", label: "Active" },
  { value: "Y", label: "Disabled" },
];

export function UserForm() {
  const { mutate, isPending, error } = useCreateUser();
  const [roleIds, setRoleIds] = React.useState<number[]>([]);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  const roles = useQuery(rolesQuery);

  /** Server-side validation messages, keyed by field name. */
  const fieldError = (name: string): string | undefined =>
    isApiError(error) ? error.fieldError(name) : undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("password_confirmation") ?? "");

    if (password !== confirmation) {
      setPasswordError("The two passwords do not match.");
      return;
    }
    setPasswordError(null);

    mutate({
      first_name: String(form.get("first_name") ?? "").trim(),
      last_name: String(form.get("last_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      password,
      password_confirmation: confirmation,
      user_type: String(form.get("user_type") ?? "CRP"),
      disabled: form.get("disabled") === "Y" ? "Y" : "N",
      roles: roleIds,
    });
  }

  function toggleRole(id: number, checked: boolean) {
    setRoleIds((current) =>
      checked ? [...current, id] : current.filter((value) => value !== id),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-6 sm:p-8">
        <FormSection
          title="Personal information"
          description="How this person appears across the portal."
        >
          <FormField
            name="first_name"
            label="First name"
            required
            autoComplete="given-name"
            error={fieldError("first_name")}
          />
          <FormField
            name="last_name"
            label="Last name"
            required
            autoComplete="family-name"
            error={fieldError("last_name")}
          />
          <FormField
            name="email"
            label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            error={fieldError("email")}
          />
          <FormField
            name="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            hint="Optional"
            error={fieldError("phone")}
          />
        </FormSection>
      </Card>

      <Card className="p-6 sm:p-8">
        <FormSection
          title="Account and security"
          description="The credentials they will sign in with."
        >
          <PasswordField
            name="password"
            label="Password"
            required
            minLength={8}
            autoComplete="new-password"
            hint="At least 8 characters"
            error={fieldError("password")}
          />
          <PasswordField
            name="password_confirmation"
            label="Confirm password"
            required
            minLength={8}
            autoComplete="new-password"
            error={passwordError ?? fieldError("password_confirmation")}
          />
          <FormSelect
            name="user_type"
            label="User type"
            defaultValue="CRP"
            options={USER_TYPES}
            error={fieldError("user_type")}
          />
          <FormSelect
            name="disabled"
            label="Status"
            defaultValue="N"
            options={STATUSES}
            error={fieldError("disabled")}
          />
        </FormSection>
      </Card>

      <Card className="p-6 sm:p-8">
        <FormSection
          title="Roles"
          description="What this person may do. Roles can be changed later."
          single
        >
          <RolePicker
            roles={roles.data ?? []}
            selected={roleIds}
            onToggle={toggleRole}
            isPending={roles.isPending}
            isError={roles.isError}
            onRetry={() => void roles.refetch()}
            error={fieldError("roles")}
          />
        </FormSection>
      </Card>

      {/* A 422 is already spelled out under each field; anything else needs
          saying once, here. */}
      {error && !isApiError(error) ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/users">Cancel</Link>
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create user
        </Button>
      </div>
    </form>
  );
}
