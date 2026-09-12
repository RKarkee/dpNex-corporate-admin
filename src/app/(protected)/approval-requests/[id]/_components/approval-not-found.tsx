"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown when the id in the URL resolves to nothing.
 *
 * A withdrawn-and-purged request, a mistyped id, and — because the endpoint
 * scopes every read to the caller's own account — a perfectly valid id
 * belonging to another corporate are all the same answer from here, and
 * deliberately so: distinguishing them would confirm that someone else's
 * request exists.
 */
export function ApprovalNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Request not found"
      description="It may have been removed, or it belongs to another account."
      action={
        <Button variant="outline" asChild>
          <Link href="/approval-requests">
            <ArrowLeft className="size-4" />
            Back to approval requests
          </Link>
        </Button>
      }
    />
  );
}
