"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown when the id in the URL resolves to nothing.
 *
 * That covers a deleted role, a mistyped id, and — because the API scopes
 * every read to the caller's corporate — a valid id belonging to a different
 * company. All three are the same answer from here: it is not yours to see.
 */
export function RoleNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Role not found"
      description="It may have been deleted, or it belongs to another corporate."
      action={
        <Button variant="outline" asChild>
          <Link href="/roles">
            <ArrowLeft className="size-4" />
            Back to roles
          </Link>
        </Button>
      }
    />
  );
}
