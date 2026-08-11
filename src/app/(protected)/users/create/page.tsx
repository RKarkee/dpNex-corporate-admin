import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { UserForm } from "./_components/user-form";

export const metadata: Metadata = {
  title: "Add user",
};

export default function CreateUserPage() {
  return (
    <RequirePermission permission="users.create">
      <Link
        href="/users"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      >
        <ArrowLeft className="size-4" />
        Back to users
      </Link>

      <PageHeader
        title="Add user"
        description="Create an account for someone in your corporate."
      />

      <div className="max-w-3xl">
        <UserForm />
      </div>
    </RequirePermission>
  );
}
