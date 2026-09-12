"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown when the id in the URL resolves to nothing.
 *
 * A deleted ticket, a mistyped id, and — because the endpoint scopes every read
 * to the caller's own organisation — a valid id belonging to someone else are
 * all the same answer from here, deliberately: distinguishing them would
 * confirm that another company's ticket exists.
 */
export function TicketNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Ticket not found"
      description="It may have been removed, or it belongs to another account."
      action={
        <Button variant="outline" asChild>
          <Link href="/support-tickets">
            <ArrowLeft className="size-4" />
            Back to support tickets
          </Link>
        </Button>
      }
    />
  );
}
