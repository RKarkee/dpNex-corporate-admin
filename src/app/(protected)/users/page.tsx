import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { UsersView } from "./_components/users-view";

export const metadata: Metadata = {
  title: "Users",
};

export default function UsersPage() {
  return (
    <RequirePermission anyOf={["corporate_view_any_user", "view_user"]}>
      <PageHeader
        title="Users"
        description="Manage staff accounts, roles and access across DpNEx."
        actions={
          <Button asChild>
            <Link href="/users/create">
              <Plus className="size-4" />
              Add user
            </Link>
          </Button>
        }
      />
      <UsersView />
    </RequirePermission>
  );
}
