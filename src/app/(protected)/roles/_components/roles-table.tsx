"use client";

import Link from "next/link";
import { Eye, Loader2, Pencil, Trash2 } from "lucide-react";

import { countPermissions } from "@/app/(protected)/roles/services/role.service";
import { can } from "@/shared/auth/permissions";
import { useOptionalSession } from "@/shared/auth/session-context";
import type { Role } from "@/shared/auth/types";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { cn } from "@/shared/lib/utils";

const COLUMNS = 5;

export interface RolesTableProps {
  roles: Role[];
  loading: boolean;
  /** A page is loading over an already-rendered table. */
  refreshing?: boolean;
  error?: unknown;
  onDelete: (role: Role) => void;
  deletingId?: number | null;
}

export function RolesTable({
  roles,
  loading,
  refreshing = false,
  error,
  onDelete,
  deletingId,
}: RolesTableProps) {
  const user = useOptionalSession();
  const canEdit = can(user, "edit_role");
  const canDelete = can(user, "delete_role");

  return (
    <div className="relative">
      {/* An overlay rather than swapping the table out: paging should not make
          the page height jump between the old rows and a spinner. */}
      {refreshing && !loading ? (
        <div className="absolute inset-0 z-10 grid place-items-center rounded-lg bg-card/60 backdrop-blur-[1px]">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {/*
              Five columns do not fit a 360px phone. Rather than let the table
              scroll sideways — which hides the action buttons, the thing people
              actually came for — the two lowest-value columns drop out. ID and
              Scope both reappear on the detail page.
            */}
            <TableHead className="hidden w-16 md:table-cell">ID</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="hidden lg:table-cell">Scope</TableHead>
            <TableHead className="hidden sm:table-cell">Permissions</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {loading ? (
            <LoadingRows />
          ) : error ? (
            <TableEmpty colSpan={COLUMNS}>
              Could not load roles. Please try again.
            </TableEmpty>
          ) : roles.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>No roles yet.</TableEmpty>
          ) : (
            roles.map((role) => (
              <TableRow
                key={role.id}
                className={cn(deletingId === role.id && "opacity-50")}
              >
                <TableCell className="hidden tabular-nums text-muted-foreground md:table-cell">
                  {role.id}
                </TableCell>

                <TableCell className="max-w-[15rem] sm:max-w-xs">
                  <Link
                    href={`/roles/${role.id}`}
                    className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {role.label?.trim() || role.name}
                  </Link>
                  {/* The machine name is what the API stores and what support
                      will ask for; the label is what people recognise. */}
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {role.name}
                  </p>
                  {/* Carries the dropped columns on small screens, so nothing
                      is lost — just restacked under the name. */}
                  <span className="mt-1.5 flex items-center gap-1.5 sm:hidden">
                    <Badge variant="secondary" className="text-[10px]">
                      {countPermissions(role)} permissions
                    </Badge>
                  </span>
                </TableCell>

                <TableCell className="hidden lg:table-cell">
                  <Badge variant="outline" className="capitalize">
                    {role.scope}
                  </Badge>
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  <Badge variant="secondary" className="whitespace-nowrap">
                    {countPermissions(role)} permissions
                  </Badge>
                </TableCell>

                <TableCell className="w-px">
                  <div className="flex items-center justify-end gap-0.5 sm:gap-1">
                    <Button variant="ghost" size="icon-sm" asChild>
                      <Link href={`/roles/${role.id}`} aria-label={`View ${role.label ?? role.name}`}>
                        <Eye className="size-4" />
                      </Link>
                    </Button>

                    {canEdit ? (
                      <Button variant="ghost" size="icon-sm" asChild>
                        <Link
                          href={`/roles/${role.id}/edit`}
                          aria-label={`Edit ${role.label ?? role.name}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                      </Button>
                    ) : null}

                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDelete(role)}
                        disabled={deletingId === role.id}
                        aria-label={`Delete ${role.label ?? role.name}`}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

/** Skeleton rows, so the first load does not collapse the card to nothing. */
function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <TableRow key={index} className="hover:bg-transparent">
          <TableCell className="hidden md:table-cell">
            <Skeleton className="h-4 w-6" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-32 sm:w-40" />
            <Skeleton className="mt-1.5 h-3 w-24 sm:w-28" />
          </TableCell>
          <TableCell className="hidden lg:table-cell">
            <Skeleton className="h-5 w-20 rounded-full" />
          </TableCell>
          <TableCell className="hidden sm:table-cell">
            <Skeleton className="h-5 w-28 rounded-full" />
          </TableCell>
          <TableCell>
            <div className="flex justify-end gap-1">
              <Skeleton className="size-9 rounded-md" />
              <Skeleton className="size-9 rounded-md" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}
