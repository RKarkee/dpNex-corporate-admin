"use client";

import { roleLabel, type Role } from "@/shared/auth/types";
import { Badge } from "@/shared/components/ui/badge";

/** How many role chips render before the rest collapse into a `+N`. */
const VISIBLE_ROLES = 2;

export function UserRoleBadges({ roles }: { roles: Role[] | undefined }) {
  if (!roles || roles.length === 0) {
    return <span className="text-sm text-muted-foreground">No roles</span>;
  }

  const shown = roles.slice(0, VISIBLE_ROLES);
  const remaining = roles.length - shown.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {shown.map((role) => (
        <Badge key={role.id} variant="secondary">
          {roleLabel(role)}
        </Badge>
      ))}
      {remaining > 0 ? (
        // Titled, so the hidden roles are recoverable without opening the row.
        <Badge variant="outline" title={roles.slice(VISIBLE_ROLES).map(roleLabel).join(", ")}>
          {`+${remaining}`}
        </Badge>
      ) : null}
    </div>
  );
}
