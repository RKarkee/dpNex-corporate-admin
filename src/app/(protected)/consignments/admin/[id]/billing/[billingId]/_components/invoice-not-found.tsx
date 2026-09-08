"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown when the id in the URL resolves to nothing. Mirrors
 * `billing-accounts/[id]/_components/invoice-not-found.tsx`: a deleted
 * invoice, a mistyped id, and — because the API scopes every read to the
 * caller's corporate — a valid id belonging to a different company are all
 * the same answer from here.
 */
export function InvoiceNotFound({ consignmentId }: { consignmentId: string }) {
  return (
    <EmptyState
      icon={SearchX}
      title="Invoice not found"
      description="It may have been removed, or it belongs to another consignment."
      action={
        <Button variant="outline" asChild>
          <Link href={`/consignments/admin/${consignmentId}/billing`}>
            <ArrowLeft className="size-4" />
            Back to billing
          </Link>
        </Button>
      }
    />
  );
}
