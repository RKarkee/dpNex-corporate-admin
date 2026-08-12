"use client";

import * as React from "react";
import { Check, ChevronDown, KeyRound } from "lucide-react";

import { roleLabel, type Role, type RolePermission } from "@/shared/auth/types";
import { Badge } from "@/shared/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { cn } from "@/shared/lib/utils";

/**
 * What each of this person's roles actually grants.
 *
 * `GET /corporate/users/{id}` returns every role with its full `permissions`
 * map nested inside, so this needs no extra request — the data is already on
 * the page, it was just being thrown away in favour of a name badge.
 *
 * Collapsed by default: two roles here came to ~90 permissions between them,
 * which would bury the contact details above it. The counts are visible
 * without expanding, which is the question most visits are asking.
 */

/** `master_data_setups` → `master data setups`. */
function groupLabel(group: string): string {
  return group.replace(/_/g, " ");
}

/** The API's `label` if it sent one, otherwise the name made readable. */
function permissionLabel(permission: RolePermission): string {
  return permission.label?.trim() || permission.name.replace(/_/g, " ");
}

function countPermissions(role: Role): number {
  return Object.values(role.permissions ?? {}).reduce(
    (total, entries) => total + (entries?.length ?? 0),
    0,
  );
}

export function UserRolePermissions({ roles }: { roles: Role[] }) {
  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No roles assigned. This account can sign in but cannot act on anything.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {roles.map((role) => (
        <li key={role.id}>
          <RoleCard role={role} />
        </li>
      ))}
    </ul>
  );
}

function RoleCard({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);

  const groups = Object.entries(role.permissions ?? {}).filter(
    ([, permissions]) => (permissions?.length ?? 0) > 0,
  );

  const total = countPermissions(role);

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="overflow-hidden rounded-xl border border-border"
    >
      <CollapsibleTrigger
        // Not a nested button: the whole header is the target, which is a much
        // easier hit than a chevron on a phone.
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors outline-none",
          "hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring/30",
          open && "border-b border-border bg-secondary/40",
        )}
        // Nothing to expand when the role carries no permissions.
        disabled={groups.length === 0}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <KeyRound className="size-4" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">
            {roleLabel(role)}
          </span>
          {/* The machine name is what support and the API use. */}
          <span className="block truncate text-xs text-muted-foreground">
            {role.name}
          </span>
        </span>

        <Badge variant={total > 0 ? "default" : "secondary"} className="shrink-0">
          {total} {total === 1 ? "permission" : "permissions"}
        </Badge>

        {groups.length > 0 ? (
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        ) : null}
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <div className="space-y-4 p-4">
          {groups.map(([group, permissions]) => (
            <section key={group}>
              <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span className="capitalize">{groupLabel(group)}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] tabular-nums">
                  {permissions?.length ?? 0}
                </span>
              </h4>

              <ul className="grid gap-1.5 sm:grid-cols-2">
                {(permissions ?? []).map((permission) => (
                  <li
                    key={permission.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/60 px-2.5 py-1.5 text-sm capitalize text-foreground"
                  >
                    <Check
                      aria-hidden
                      className="size-3.5 shrink-0 text-success"
                      strokeWidth={3}
                    />
                    <span className="min-w-0 truncate">
                      {permissionLabel(permission)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
