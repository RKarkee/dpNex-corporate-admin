"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown when the id in the URL resolves to nothing. Mirrors `UserNotFound`:
 * a deleted invoice, a mistyped id, and — because the API scopes every read
 * to the caller's corporate — a valid id belonging to a different company
 * are all the same answer from here.
 */
export function InvoiceNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Invoice not found"
      description="It may have been removed, or it belongs to another corporate."
      action={
        <Button variant="outline" asChild>
          <Link href="/billing-accounts">
            <ArrowLeft className="size-4" />
            Back to billing accounts
          </Link>
        </Button>
      }
    />
  );
}
