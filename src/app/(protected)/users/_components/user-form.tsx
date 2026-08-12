"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { rolesQuery } from "@/shared/api/services/roles.service";
import type { User, YesNo } from "@/shared/auth/types";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFileUrl } from "@/shared/hooks/use-file-url";

import {
  FormField,
  FormSection,
  FormSelect,
  PasswordField,
} from "./form-fields";
import { ProfileImageField } from "./profile-image-field";
import { RoleMultiSelect } from "./role-multi-select";

/**
 * Add User / Edit user — one form, two modes.
 *
 * Uncontrolled: the fields live in the DOM and `FormData` reads them on submit,
 * the same pattern as the sign-in form. The three exceptions are the role
 * checkboxes (which need an array rather than a string), the image (a file
 * input cannot be cleared without React holding the `File`), and the local
 * password-match error, which has no server round trip to hang off.
 *
 * There is no corporate field: `X-Corporate-Code` already scopes the request,
 * so the API decides which corporate the user joins, not this form.
 *
 * Edit mode drops the password card — changing someone else's password has no
 * verified endpoint here — and the roles still travel on their own request, so
 * the parent is told whether the selection actually moved.
 */

/** `user_type` on a corporate account. `ADM` belongs to the Super Admin portal. */
// const USER_TYPES = [
//   { value: "CRP", label: "Corporate" },
//   { value: "INT", label: "Internal" },
//   { value: "EXT", label: "External" },
// ];

const STATUSES: { value: YesNo; label: string }[] = [
  { value: "N", label: "Active" },
  { value: "Y", label: "Disabled" },
];

/** What the form hands back on submit. The parent decides where it goes. */
export interface UserFormValues {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  /** Empty in edit mode — that mode renders no password fields. */
  password: string;
  password_confirmation: string;
  disabled: YesNo;
  roles: number[];
  /** Whether `roles` differs from what the record arrived with. */
  rolesChanged: boolean;
  image: File | null;
}

export interface UserFormProps {
  mode: "create" | "edit";
  /** The record being edited. Absent in create mode, and while it loads. */
  user?: User;
  loading?: boolean;
  submitting: boolean;
  /** The failed mutation, for the field-level 422 messages. */
  error: unknown;
  onSubmit: (values: UserFormValues) => void;
  cancelHref: string;
}

/**
 * `first_name` / `last_name` are optional on the API's user shape, and older
 * records only carry the combined `name`. Splitting on the first space is the
 * same fallback the Super Admin portal uses.
 */
function splitName(user: User | undefined): { first: string; last: string } {
  if (user?.first_name || user?.last_name) {
    return { first: user.first_name ?? "", last: user.last_name ?? "" };
  }

  const parts = (user?.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };

  // `noUncheckedIndexedAccess`: the guard above proves there is a first entry,
  // but the compiler still types it as possibly undefined.
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

function roleIdsOf(user: User | undefined): number[] {
  return (user?.roles ?? []).map((role) => role.id);
}

/** Same members, order aside — the role picker does not preserve one. */
function sameIds(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort((x, y) => x - y);
  return [...a]
    .sort((x, y) => x - y)
    .every((value, index) => value === sortedB[index]);
}

export function UserForm({
  mode,
  user,
  loading = false,
  submitting,
  error,
  onSubmit,
  cancelHref,
}: UserFormProps) {
  const [roleIds, setRoleIds] = React.useState<number[]>(() => roleIdsOf(user));
  const [image, setImage] = React.useState<File | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  const roles = useQuery(rolesQuery);

  // The record stores an authenticated endpoint, not a file. Resolved here
  // rather than inside the field, whose job is preview and blob lifetime —
  // by the time it arrives it is an ordinary URL, which is what that
  // component already knows how to handle.
  const { src: storedPhoto } = useFileUrl(user?.image ?? user?.image_thumbnail);

  /**
   * Seed from the loaded record exactly once per user id. Syncing on every
   * render of `user` would wipe the selection each time React Query refetched
   * in the background.
   */
  const seededFor = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!user || seededFor.current === user.id) return;

    seededFor.current = user.id;
    setRoleIds(roleIdsOf(user));
  }, [user]);

  const initialRoleIds = React.useMemo(() => roleIdsOf(user), [user]);
  const isEdit = mode === "edit";
  const name = splitName(user);

  /** Server-side validation messages, keyed by field name. */
  const fieldError = (name: string): string | undefined =>
    isApiError(error) ? error.fieldError(name) : undefined;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("password_confirmation") ?? "");

    if (!isEdit && password !== confirmation) {
      setPasswordError("The two passwords do not match.");
      return;
    }
    setPasswordError(null);

    onSubmit({
      first_name: String(form.get("first_name") ?? "").trim(),
      last_name: String(form.get("last_name") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
      phone: String(form.get("phone") ?? "").trim(),
      password,
      password_confirmation: confirmation,
      disabled: form.get("disabled") === "Y" ? "Y" : "N",
      roles: roleIds,
      rolesChanged: !sameIds(roleIds, initialRoleIds),
      image,
    });
  }

  if (loading) return <UserFormSkeleton />;

  const statusField = (
    <FormSelect
      name="disabled"
      label="Status"
      defaultValue={user?.disabled === "Y" ? "Y" : "N"}
      options={STATUSES}
      error={fieldError("disabled")}
    />
  );

  return (
    // Remounted per record: the inputs are uncontrolled, so a `defaultValue`
    // that arrives after the first render would otherwise never be applied.
    <form
      key={user?.id ?? "create"}
      onSubmit={handleSubmit}
      className="space-y-6"
    >
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
            defaultValue={name.first}
            error={fieldError("first_name")}
          />
          <FormField
            name="last_name"
            label="Last name"
            required
            autoComplete="family-name"
            defaultValue={name.last}
            error={fieldError("last_name")}
          />
          <FormField
            name="email"
            label="Email address"
            type="email"
            required
            autoComplete="email"
            placeholder="name@company.com"
            defaultValue={user?.email ?? ""}
            error={fieldError("email")}
          />
          <FormField
            name="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
            hint="Optional"
            defaultValue={user?.phone ?? ""}
            error={fieldError("phone")}
          />
          {/* Edit has no password card to host it, and a card holding one
              select reads as a mistake. */}
          {isEdit ? statusField : null}
        </FormSection>
      </Card>

      {isEdit ? null : (
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
            {/* <FormSelect
              name="user_type"
              label="User type"
              defaultValue="CRP"
              options={USER_TYPES}
              error={fieldError("user_type")}
            /> */}
            {statusField}
          </FormSection>
        </Card>
      )}

      <Card className="p-6 sm:p-8">
        <FormSection
          title="Roles"
          description="What this person may do. Roles can be changed later."
          single
        >
          <RoleMultiSelect
            roles={roles.data ?? []}
            selected={roleIds}
            onChange={setRoleIds}
            isPending={roles.isPending}
            isError={roles.isError}
            onRetry={() => void roles.refetch()}
            // Laravel keys array errors as `roles` and `roles.0`; take
            // whichever it sent so a bad id is not silently dropped.
            error={fieldError("roles") ?? fieldError("roles.0")}
            disabled={submitting}
          />
        </FormSection>
      </Card>

      <Card className="p-6 sm:p-8">
        <FormSection
          title="Profile photo"
          description="A picture makes the person easier to spot in the directory."
          single
        >
          <ProfileImageField
            file={image}
            onChange={setImage}
            disabled={submitting}
            error={fieldError("image")}
            initialPreviewUrl={storedPhoto}
          />
        </FormSection>
      </Card>

      {/* A 422 is already spelled out under each field; anything else needs
          saying once, here. */}
      {error && !isApiError(error) && error instanceof Error ? (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error.message}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Save changes" : "Create user"}
        </Button>
      </div>
    </form>
  );
}

/**
 * The same card rhythm with the fields blanked, so the page does not jump when
 * the record lands.
 */
function UserFormSkeleton() {
  return (
    <div className="space-y-6">
      {[4, 1, 1].map((fields, card) => (
        <Card key={card} className="space-y-5 p-6 sm:p-8">
          <div className="space-y-2 border-b border-border/70 pb-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className={fields > 1 ? "grid gap-5 sm:grid-cols-2" : "grid gap-5"}>
            {Array.from({ length: fields }).map((_, field) => (
              <div key={field} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-11 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
