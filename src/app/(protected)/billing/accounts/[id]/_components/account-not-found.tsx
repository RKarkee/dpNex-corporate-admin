"use client";

import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";

/**
 * Shown when the id in the URL resolves to nothing. A removed account, a
 * mistyped id and another corporate's account are deliberately the same
 * answer — distinguishing them would confirm the other one exists.
 */
export function AccountNotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="Billing account not found"
      description="It may have been removed, or it belongs to another corporate."
      action={
        <Button variant="outline" asChild>
          <Link href="/billing/accounts">
            <ArrowLeft className="size-4" />
            Back to billing accounts
          </Link>
        </Button>
      }
    />
  );
}
