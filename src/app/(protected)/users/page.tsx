import type { Metadata } from "next";
import { Plus, Users } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { EmptyState } from "@/shared/components/empty-state";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

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
          <Button>
            <Plus className="size-4" />
            Add user
          </Button>
        }
      />
      <EmptyState
        icon={Users}
        title="No users yet"
        description="Once the users API is wired up, the directory table will render here."
      />
    </RequirePermission>
  );
}
