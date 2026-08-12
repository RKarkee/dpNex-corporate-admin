"use client";

import { useOptionalSession } from "@/shared/auth/session-context";
import { displayName, isDisabled, type User } from "@/shared/auth/types";
import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { cn } from "@/shared/lib/utils";

import { UserAvatar } from "./user-avatar";
import { UserRowActions } from "./user-row-actions";
import { UserStatusBadge } from "./user-status-badge";

/**
 * The directory table.
 *
 * Six columns do not fit a phone, and sideways scrolling would push the
 * actions — the thing people came for — off screen. So Email, Phone and Status
 * drop out below their breakpoints and restack under the name instead, where
 * nothing is lost. Status restacks as the dot on the avatar, plus the word
 * when someone is disabled.
 *
 * Roles are deliberately not a column: a person can hold several, which makes
 * the cell either a wrapping pile of badges or a `+N` that answers nothing.
 * The detail page lists them in full, with the permissions each one grants.
 */
/**
 * Tighter gutters below `sm`, so the three visible columns fit a 375px screen
 * without the container scrolling the actions off the right edge. Written once
 * here because the table and its skeleton have to agree on column widths.
 */
const TABLE_DENSITY =
  "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";

/**
 * The last column, pinned to the right below `sm`.
 *
 * `bg-inherit` rather than a colour of its own: the row owns the background,
 * so hover still reaches the pinned cell instead of being painted over by it.
 * Above `sm` there is room for every column and pinning is only noise.
 */
const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

/** For the `colSpan` of the "no results" row. */
const COLUMNS = 6;

export interface UsersTableProps {
  users: User[];
  onDelete: (user: User) => void;
  /** The row whose delete is in flight, if any. */
  deletingId?: number | null;
}

export function UsersTable({ users, onDelete, deletingId }: UsersTableProps) {
  // `useOptionalSession` rather than `useSession`: the table is under
  // `AuthGuard`, so a user is guaranteed in practice, but nothing here breaks
  // without one — the marker simply does not render.
  const signedInId = useOptionalSession()?.id;

  return (
    // No `Card` of its own: the page wraps the search field, this table and
    // the pagination in one shell, the way the roles list does.
    <div className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead className="w-12 sm:w-16">User</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Phone</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>No users match your search.</TableEmpty>
          ) : null}

          {users.map((user) => (
            <TableRow
              key={user.id}
              // `bg-card` so the pinned action cell has something opaque to
              // inherit — without it the scrolled rows show through.
              className={cn("bg-card", deletingId === user.id && "opacity-50")}
            >
              <TableCell>
                <UserAvatar user={user} />
              </TableCell>

              <TableCell className="max-w-34 sm:max-w-xs">
                <p className="truncate font-medium text-foreground">
                  {displayName(user)}
                  {user.id === signedInId ? (
                    <>
                      {/* Decorative on its own — the `sr-only` text is what
                          carries the meaning, since an asterisk read aloud as
                          "star" says nothing about whose row this is. */}
                      <span aria-hidden className="ml-1 font-semibold text-primary">
                        *
                      </span>
                      <span className="sr-only"> (you)</span>
                    </>
                  ) : null}
                </p>

                {/* Carries the dropped columns on small screens. */}
                <p className="truncate text-xs text-muted-foreground md:hidden">
                  {user.email}
                </p>
                {/* The avatar's dot is the status signal at this width, and
                    colour cannot carry it alone. Only the exceptional state is
                    worth the words — an active user just gets the dot. */}
                {isDisabled(user) ? (
                  <span className="mt-1.5 block text-xs font-medium text-destructive sm:hidden">
                    Disabled
                  </span>
                ) : null}
              </TableCell>

              <TableCell className="hidden max-w-64 md:table-cell">
                <a
                  href={`mailto:${user.email}`}
                  className="block truncate text-muted-foreground hover:text-primary hover:underline"
                >
                  {user.email}
                </a>
              </TableCell>

              <TableCell className="hidden whitespace-nowrap text-muted-foreground lg:table-cell">
                {user.phone?.trim() ? (
                  user.phone
                ) : (
                  // An em dash reads as "nothing here" to sighted users but as
                  // noise to a screen reader, so name the absence instead.
                  <span aria-label="No phone number">—</span>
                )}
              </TableCell>

              <TableCell className="hidden sm:table-cell">
                <UserStatusBadge user={user} />
              </TableCell>

              <TableCell className={cn("w-px", STICKY_ACTIONS)}>
                <UserRowActions
                  user={user}
                  onDelete={onDelete}
                  deleting={deletingId === user.id}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Placeholder rows, sized to the real ones so the layout does not jump. */
export function UsersTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead className="w-12 sm:w-16">User</TableHead>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Phone</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>
              Action
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody aria-hidden>
          {Array.from({ length: rows }, (_, index) => (
            <TableRow key={index} className="bg-card hover:bg-transparent">
              <TableCell>
                <Skeleton className="size-9 rounded-full" />
              </TableCell>
              <TableCell className="max-w-34 sm:max-w-xs">
                <Skeleton className="h-3.5 w-32" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-3.5 w-44" />
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <Skeleton className="h-3.5 w-24" />
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className={cn("w-px", STICKY_ACTIONS)}>
                <div className="flex justify-end gap-0.5 sm:gap-1">
                  <Skeleton className="size-9 rounded-md" />
                  <Skeleton className="size-9 rounded-md" />
                  <Skeleton className="size-9 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
