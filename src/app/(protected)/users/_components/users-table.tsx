"use client";

import { useOptionalSession } from "@/shared/auth/session-context";
import {
  displayName,
  initials,
  isDisabled,
  roleLabel,
  type Role,
  type User,
} from "@/shared/auth/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";

/** How many role chips render before the rest collapse into a `+N`. */
const VISIBLE_ROLES = 2;

export function UsersTable({ users }: { users: User[] }) {
  // `useOptionalSession` rather than `useSession`: the table is under
  // `AuthGuard`, so a user is guaranteed in practice, but nothing here breaks
  // without one — the marker simply does not render.
  const signedInId = useOptionalSession()?.id;

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>User</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    {user.image_thumbnail ? (
                      <AvatarImage src={user.image_thumbnail} alt="" />
                    ) : null}
                    <AvatarFallback>{initials(user)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {displayName(user)}
                      {user.id === signedInId ? (
                        <>
                          {/* Decorative on its own — the `sr-only` text is what
                              carries the meaning, since an asterisk read aloud
                              as "star" says nothing about whose row this is. */}
                          <span
                            aria-hidden
                            className="ml-1 font-semibold text-primary"
                          >
                            *
                          </span>
                          <span className="sr-only"> (you)</span>
                        </>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell className="whitespace-nowrap text-muted-foreground">
                {user.phone?.trim() ? (
                  user.phone
                ) : (
                  // An em dash reads as "nothing here" to sighted users but as
                  // noise to a screen reader, so name the absence instead.
                  <span aria-label="No phone number">—</span>
                )}
              </TableCell>

              <TableCell>
                <RoleBadges roles={user.roles} />
              </TableCell>

              <TableCell>
                <StatusBadge user={user} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function RoleBadges({ roles }: { roles: Role[] | undefined }) {
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
        <Badge variant="outline">{`+${remaining}`}</Badge>
      ) : null}
    </div>
  );
}

/** Colour alone never carries the state — the word is the signal. */
function StatusBadge({ user }: { user: User }) {
  const off = isDisabled(user);

  return (
    <Badge variant={off ? "destructive" : "success"}>
      {off ? "Disabled" : "Active"}
    </Badge>
  );
}

/** Placeholder rows, sized to the real ones so the layout does not jump. */
export function UsersTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>User</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Roles</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody aria-hidden>
          {Array.from({ length: rows }, (_, index) => (
            <TableRow key={index} className="hover:bg-transparent">
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-3 w-44" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-3.5 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-28 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
