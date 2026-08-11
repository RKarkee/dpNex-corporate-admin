"use client";

import Link from "next/link";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { useOptionalSession } from "@/shared/auth/session-context";
import { displayName, type User } from "@/shared/auth/types";
import { Button } from "@/shared/components/ui/button";

/**
 * View, edit and delete for one row.
 *
 * The three controls are **not** permission-gated. Hiding a button is
 * presentation, never access control — the API is what refuses the operation,
 * and a 403 already surfaces as a toast through the client's error
 * interceptor. Gating them here only meant a permission name we guessed wrong
 * silently removed a control the account could actually use, which is what
 * happened with `delete_user`.
 *
 * Every button carries the person's name in its accessible name — seven
 * identical "Edit" buttons down a column tell a screen-reader user nothing
 * about which row they are on.
 */
export function UserRowActions({
  user,
  onDelete,
  deleting = false,
}: {
  user: User;
  onDelete: (user: User) => void;
  /** This row's delete is in flight. */
  deleting?: boolean;
}) {
  const signedIn = useOptionalSession();
  const name = displayName(user);

  // Visible but inert on your own row: deleting the account you are signed in
  // as would sign you out mid-action and leave the confirm dialog talking
  // about a session that no longer exists.
  const isSelf = user.id === signedIn?.id;

  return (
    <div className="flex items-center justify-end gap-0.5 sm:gap-1">
      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/users/${user.id}`} aria-label={`View ${name}`}>
          <Eye className="size-4" />
        </Link>
      </Button>

      <Button variant="ghost" size="icon-sm" asChild>
        <Link href={`/users/${user.id}/edit`} aria-label={`Edit ${name}`}>
          <Pencil className="size-4" />
        </Link>
      </Button>

      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onDelete(user)}
        disabled={deleting || isSelf}
        aria-label={isSelf ? "You cannot delete your own account" : `Delete ${name}`}
        title={isSelf ? "You cannot delete your own account" : undefined}
        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
