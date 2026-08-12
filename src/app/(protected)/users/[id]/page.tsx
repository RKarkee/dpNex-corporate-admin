"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { useOptionalSession } from "@/shared/auth/session-context";
import { displayName } from "@/shared/auth/types";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";

import { UserDetail, UserDetailSkeleton } from "./_components/user-detail";
import { UserNotFound } from "./_components/user-not-found";
import { useDeleteUser } from "../_hooks/use-delete-user";
import { useUser } from "../_hooks/use-user";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next 15+ hands params in as a promise; `use()` unwraps it during render.
  const { id } = React.use(params);
  const userId = Number(id);
  const valid = Number.isFinite(userId);

  const router = useRouter();
  const query = useUser(valid ? userId : undefined);
  const signedIn = useOptionalSession();
  const deleteUser = useDeleteUser();
  const [confirming, setConfirming] = React.useState(false);

  const handleConfirmDelete = React.useCallback(async () => {
    await deleteUser.mutateAsync(userId);
    // `replace`: the record is gone, so Back must not return to a page that
    // can only render "User not found".
    router.replace("/users");
  }, [deleteUser, router, userId]);

  if (!valid || (query.isError && !query.data)) return <UserNotFound />;

  const user = query.data;
  // Deleting the account you are signed in as would sign you out mid-action.
  const isSelf = user?.id === signedIn?.id;

  return (
    <RequirePermission anyOf={["corporate_view_any_user", "view_user"]}>
      <PageHeader
        title={user ? displayName(user) : "User"}
        description="View detailed information about the user."
        actions={
          <>
            <Button variant="outline" asChild className="flex-1 sm:flex-none">
              <Link href="/users">
                <ArrowLeft className="size-4" />
                Back
              </Link>
            </Button>

            <Button asChild className="flex-1 sm:flex-none">
              <Link href={`/users/${userId}/edit`}>
                <Pencil className="size-4" />
                {/* "Edit user" wraps at 360px next to the other two; the noun
                    is already obvious from the page title. */}
                <span className="sm:hidden">Edit</span>
                <span className="hidden sm:inline">Edit user</span>
              </Link>
            </Button>

            <Button
              variant="destructive"
              className="flex-1 sm:flex-none"
              onClick={() => setConfirming(true)}
              disabled={!user || isSelf || deleteUser.isPending}
              title={isSelf ? "You cannot delete your own account" : undefined}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        }
      />

      {query.isLoading || !user ? (
        <UserDetailSkeleton />
      ) : (
        <UserDetail user={user} />
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this user?"
        description={
          user ? (
            <>
              <span className="font-medium text-foreground">
                {displayName(user)}
              </span>{" "}
              will lose access to DpNEx immediately, along with the roles
              assigned to them. This cannot be undone.
            </>
          ) : null
        }
        confirmLabel="Delete user"
        onConfirm={handleConfirmDelete}
      />
    </RequirePermission>
  );
}
