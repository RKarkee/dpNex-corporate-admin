"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, KeyRound, Layers, Pencil, Shield } from "lucide-react";

import {
  countPermissions,
  groupLabel,
  permissionLabel,
} from "@/app/(protected)/roles/services/role.service";
import { can } from "@/shared/auth/permissions";
import { RequirePermission } from "@/shared/auth/require-permission";
import { useOptionalSession } from "@/shared/auth/session-context";
import type { Role } from "@/shared/auth/types";
import { PageHeader } from "@/shared/components/page-header";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";

import { RoleNotFound } from "../_components/role-not-found";
import { useRole } from "../_hooks/use-roles";

export default function RoleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const roleId = Number(id);
  const valid = Number.isFinite(roleId);

  const query = useRole(valid ? roleId : undefined);
  const user = useOptionalSession();

  if (!valid || (query.isError && !query.data)) return <RoleNotFound />;

  const role = query.data;

  return (
    <RequirePermission anyOf={["view_role", "corporate_view_any_role"]}>
      <PageHeader
        title={role ? (role.label?.trim() || role.name) : "Role"}
        description="Role details and assigned permissions."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/roles">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>
            {can(user, "edit_role") ? (
              <Button asChild className="flex-1 sm:flex-none">
                <Link href={`/roles/${roleId}/edit`}>
                  <Pencil className="size-4" />
                  {/* "Edit role" wraps at 360px next to Back; the noun is
                      already obvious from the page title. */}
                  <span className="sm:hidden">Edit</span>
                  <span className="hidden sm:inline">Edit role</span>
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      {query.isLoading || !role ? <DetailSkeleton /> : <RoleDetail role={role} />}
    </RequirePermission>
  );
}

function RoleDetail({ role }: { role: Role }) {
  const groups = Object.entries(role.permissions ?? {}).filter(
    ([, permissions]) => (permissions?.length ?? 0) > 0,
  );

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-1">
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="size-[18px] text-primary" />
              Role information
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Field label="Name">{role.label?.trim() || "—"}</Field>

            <Field label="System name">
              {/* `break-all`: these are long unbroken snake_case strings with
                  no space for the browser to wrap at. */}
              <code className="break-all font-mono text-xs">{role.name}</code>
            </Field>

            <Field label="Scope">
              <Badge variant="outline" className="capitalize">
                {role.scope}
              </Badge>
            </Field>

            <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
              <Stat
                icon={Layers}
                label="Groups"
                value={groups.length}
              />
              <Stat
                icon={KeyRound}
                label="Permissions"
                value={countPermissions(role)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4 lg:col-span-2">
        {groups.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              This role has no permissions assigned.
            </CardContent>
          </Card>
        ) : (
          groups.map(([name, permissions]) => (
            <Card key={name}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm capitalize">
                  <span>{groupLabel(name)}</span>
                  <Badge variant="secondary">{permissions?.length ?? 0}</Badge>
                </CardTitle>
              </CardHeader>

              <CardContent>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {(permissions ?? []).map((permission) => (
                    <li
                      key={permission.id}
                      className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2 text-sm capitalize text-foreground"
                    >
                      <Check className="size-3.5 shrink-0 text-success" />
                      <span className="min-w-0 truncate">
                        {permissionLabel(permission)}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-foreground">{children}</div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-secondary/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">
        {value}
      </p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardContent className="space-y-4 p-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="p-5">
              <Skeleton className="h-4 w-28" />
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 6 }).map((__, cell) => (
                  <Skeleton key={cell} className="h-9 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
