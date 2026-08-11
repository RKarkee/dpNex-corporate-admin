"use client";

import { Loader2 } from "lucide-react";

import type { RoleOption } from "@/shared/api/services/roles.service";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Label } from "@/shared/components/ui/label";

/**
 * Role selection, and the four states the roles request can be in.
 *
 * The only controlled part of the form: checkboxes produce an array, which
 * `FormData` cannot express as cleanly as the parent holding the ids.
 *
 * A plain checkbox list, not a popover multi-select — every option is visible
 * and tabbable with no custom key handling, which is the whole reason the
 * reference project's hand-rolled dropdown was not copied.
 */
export function RolePicker({
  roles,
  selected,
  onToggle,
  isPending,
  isError,
  onRetry,
  error,
}: {
  roles: RoleOption[];
  selected: number[];
  onToggle: (id: number, checked: boolean) => void;
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  /** A server-side complaint about the `roles` field itself. */
  error?: string;
}) {
  if (isPending) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading roles…
      </p>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-destructive">
          Roles could not be loaded.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No roles have been set up for this corporate yet. The account can be
        created now and given a role later.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="grid gap-3 sm:grid-cols-2">
        {roles.map((role) => {
          const inputId = `role-${role.id}`;
          return (
            <li key={role.id} className="flex items-center gap-2.5">
              <Checkbox
                id={inputId}
                checked={selected.includes(role.id)}
                onCheckedChange={(checked) => onToggle(role.id, checked === true)}
              />
              <Label htmlFor={inputId} className="font-normal">
                {role.label}
              </Label>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
