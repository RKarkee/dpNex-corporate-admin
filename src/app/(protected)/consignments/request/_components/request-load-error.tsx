"use client";

import Link from "next/link";
import { FileQuestion, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

/**
 * What the detail and edit pages show when the record does not load.
 *
 * The two cases are not the same and must not read the same. A 404 is final —
 * the request is gone, or the id was never valid — and "Request not found"
 * with a way back to the list is the whole answer.
 *
 * Anything else is transient: the API was down, the token was refused, the
 * network dropped. Telling someone their consignment was "not found" in that
 * situation is actively misleading — they will go looking for a record that
 * exists — and offering no retry leaves them at a dead end on a page they
 * reached by clicking Edit.
 */
export function RequestLoadError({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  const missing = isApiError(error) && error.status === 404;

  if (missing) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Request not found"
        description="It may have been deleted, or the link may be wrong."
        action={
          <Button asChild>
            <Link href="/consignments/request">Back to requests</Link>
          </Button>
        }
      />
    );
  }

  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" strokeWidth={2} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        Could not load this request
      </h3>
      {/* `ApiError.message` is already sanitised for display; a raw upstream
          body would leak stack traces at 5xx. */}
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {isApiError(error)
          ? error.message
          : "Something went wrong. Please try again."}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button asChild>
          <Link href="/consignments/request">Back to requests</Link>
        </Button>
      </div>
    </Card>
  );
}
