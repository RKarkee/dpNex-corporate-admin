"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown when the id in the URL resolves to nothing.
 *
 * A removed pickup, a mistyped id, and — because the endpoint scopes every read
 * to the caller's own organisation — a valid id belonging to someone else are
 * all the same answer from here.
 */
export function PickupNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Pickup request not found"
      description="It may have been removed, or it belongs to another account."
      action={
        <Button variant="outline" asChild>
          <Link href="/pickup-requests">
            <ArrowLeft className="size-4" />
            Back to pickup requests
          </Link>
        </Button>
      }
    />
  );
}
