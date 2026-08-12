import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";
import { Button } from "@/shared/components/ui/button";

import { CreateUserForm } from "./_components/create-user-form";

export const metadata: Metadata = {
  title: "Add user",
};

export default function CreateUserPage() {
  // `create_user`, not `users.create` — the API returns whole permission names,
  // so a dotted string never matches and this page would redirect for everyone
  // the moment a real permission map arrives.
  return (
    <RequirePermission permission="create_user">
      <PageHeader
        title="Add user"
        description="Create an account for someone in your corporate."
        actions={
          // The same control the detail page uses, rather than a bare text
          // link above the title — one way back from every user screen.
          <Button variant="outline" asChild className="flex-1 sm:flex-none">
            <Link href="/users">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="max-w-3xl">
        <CreateUserForm />
      </div>
    </RequirePermission>
  );
}
