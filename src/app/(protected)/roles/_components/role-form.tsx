"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, Shield } from "lucide-react";

import type { RoleInput } from "@/app/(protected)/roles/services/role.service";
import { flattenPermissions } from "@/app/(protected)/roles/services/role.service";
import { isApiError } from "@/shared/api/errors";
import type { Role } from "@/shared/auth/types";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

import { usePermissionGroups } from "../_hooks/use-roles";
import { PermissionMatrix } from "./permission-matrix";

/**
 * Create and edit share this component — the two differ only in what they
 * start from and where they submit to.
 *
 * Deliberately absent, unlike the Super Admin portal's version: the `scope`
 * select and the corporate combobox. Both are implied by `X-Corporate-Code`,
 * and `name` is derived server-side from the label.
 */
export interface RoleFormProps {
  mode: "create" | "edit";
  /** Present in edit mode once loaded. */
  role?: Role;
  loading?: boolean;
  submitting: boolean;
  error?: unknown;
  onSubmit: (input: RoleInput) => void;
  cancelHref: string;
}

export function RoleForm({
  mode,
  role,
  loading = false,
  submitting,
  error,
  onSubmit,
  cancelHref,
}: RoleFormProps) {
  const permissionsQuery = usePermissionGroups();
  const groups = permissionsQuery.data ?? {};

  const [label, setLabel] = React.useState("");
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [touched, setTouched] = React.useState(false);

  /**
   * Seed from the loaded role exactly once per role id. Syncing on every render
   * of `role` would wipe the user's edits each time React Query refetched in
   * the background.
   */
  const seededFor = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!role || seededFor.current === role.id) return;

    seededFor.current = role.id;
    setLabel(role.label?.trim() ?? "");

    const ids = new Set<number>();
    for (const entries of Object.values(role.permissions ?? {})) {
      for (const permission of entries ?? []) ids.add(permission.id);
    }
    setSelected(ids);
  }, [role]);

  const total = flattenPermissions(groups).length;
  const labelError = touched && !label.trim() ? "Enter a name for this role." : null;
  const permissionError =
    touched && selected.size === 0 ? "Select at least one permission." : null;

  /**
   * Field-level errors from a 422, so the server's own validation lands on the
   * input it refers to instead of only in a toast.
   *
   * Laravel keys these by request field. `label` maps to an input we render;
   * `permissions` (and `permissions.3`, for a bad id in the array) has no
   * single input, so it is shown under the matrix instead of being swallowed.
   */
  const apiError = isApiError(error) ? error : undefined;
  const labelServerError = apiError?.fieldError("label");

  const permissionServerError = React.useMemo(() => {
    const fields = apiError?.fieldErrors;
    if (!fields) return undefined;

    // `permissions`, `permissions.0`, `permissions.*` — anything scoped to the
    // array rather than to a named input.
    const messages = Object.entries(fields)
      .filter(([key]) => key === "permissions" || key.startsWith("permissions."))
      .flatMap(([, value]) => value);

    return messages[0];
  }, [apiError]);

  /** Anything the API flagged that maps to no field we render. */
  const unmappedErrors = React.useMemo(() => {
    const fields = apiError?.fieldErrors;
    if (!fields) return [];

    return Object.entries(fields)
      .filter(
        ([key]) =>
          key !== "label" && key !== "permissions" && !key.startsWith("permissions."),
      )
      .flatMap(([key, value]) => value.map((message) => `${key}: ${message}`));
  }, [apiError]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);

    if (!label.trim() || selected.size === 0) return;

    onSubmit({ label: label.trim(), permissions: [...selected] });
  }

  const busy = loading || permissionsQuery.isLoading;

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={mode === "create" ? "Create role" : "Edit role"}
        description={
          mode === "create"
            ? "Name the role and choose what it can do."
            : "Update the role's name and permissions."
        }
        actions={
          <Button variant="outline" asChild>
            <Link href={cancelHref}>
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Left: role details, sticky so Save is always reachable ── */}
        <div className="lg:col-span-1">
          <Card className="lg:sticky lg:top-24">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-[18px] text-primary" />
                Role details
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="label">
                  Role name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="label"
                  value={label}
                  onChange={(event) => setLabel(event.target.value)}
                  onBlur={() => setTouched(true)}
                  placeholder="e.g. Operations Manager"
                  disabled={busy || submitting}
                  aria-invalid={Boolean(labelError || labelServerError)}
                  aria-describedby={
                    labelError || labelServerError ? "label-error" : undefined
                  }
                />
                {labelError || labelServerError ? (
                  <p id="label-error" role="alert" className="text-xs text-destructive">
                    {labelError ?? labelServerError}
                  </p>
                ) : null}

                {mode === "edit" && role ? (
                  <p className="text-xs text-muted-foreground">
                    System name: <code className="font-mono">{role.name}</code>
                  </p>
                ) : null}
              </div>

              <ProgressSummary selected={selected.size} total={total} />

              {/* Client-side check first, then whatever the API said about the
                  permissions array, then anything it flagged that maps to no
                  input we render — so no server message is ever swallowed. */}
              {permissionError || permissionServerError ? (
                <p role="alert" className="text-xs text-destructive">
                  {permissionError ?? permissionServerError}
                </p>
              ) : null}

              {unmappedErrors.length > 0 ? (
                <ul role="alert" className="space-y-1 text-xs text-destructive">
                  {unmappedErrors.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              ) : null}

              {/*
                Hidden on mobile. Below `lg` this card stacks *above* the
                matrix, so a Save button here would sit above ~70 checkboxes —
                submitting would mean scrolling all the way back up. The sticky
                bar at the bottom of the page takes over there.
              */}
              <div className="hidden flex-col gap-2 lg:flex">
                <Button type="submit" disabled={busy || submitting}>
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {mode === "create" ? "Create role" : "Save changes"}
                </Button>
                <Button type="button" variant="ghost" asChild disabled={submitting}>
                  <Link href={cancelHref}>Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: the permission matrix ── */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permissions</CardTitle>
            </CardHeader>
            <CardContent>
              {busy ? (
                <MatrixSkeleton />
              ) : permissionsQuery.error ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Could not load the permission list. Reload to try again.
                </p>
              ) : (
                <PermissionMatrix
                  groups={groups}
                  selected={selected}
                  onChange={setSelected}
                  disabled={submitting}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/*
        Mobile action bar. Sticky to the bottom of the viewport so Save is
        reachable from anywhere in the matrix. `pb-[env(safe-area-inset-bottom)]`
        keeps it clear of the iOS home indicator.
      */}
      <div
        className={cn(
          "sticky bottom-0 z-20 mt-5 flex items-center gap-2 border-t border-border",
          "bg-card/95 py-3 backdrop-blur-md lg:hidden",
          // The negative margin cancels `main`'s padding so the bar spans the
          // full width; the matching `px` puts the content back where it was.
          "-mx-4 px-4 sm:-mx-6 sm:px-6",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        )}
      >
        <div className="flex-1 text-sm">
          <span className="font-semibold tabular-nums text-foreground">
            {selected.size}
          </span>
          <span className="text-muted-foreground"> of {total} selected</span>
        </div>

        <Button type="button" variant="ghost" asChild disabled={submitting}>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={busy || submitting}>
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {mode === "create" ? "Create" : "Save"}
        </Button>
      </div>
    </form>
  );
}

function ProgressSummary({ selected, total }: { selected: number; total: number }) {
  const percent = total > 0 ? Math.round((selected / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Selected</span>
        <span className="font-semibold tabular-nums text-foreground">
          {selected} <span className="text-muted-foreground">/ {total}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={selected}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label="Permissions selected"
        className="h-2 w-full overflow-hidden rounded-full bg-secondary"
      >
        <div
          className={cn(
            "h-full rounded-full bg-primary transition-[width] duration-300 ease-out",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full max-w-xs" />
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((__, cell) => (
              <Skeleton key={cell} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
