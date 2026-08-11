"use client";

import { TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";

/**
 * The table's failure state.
 *
 * Shaped like `EmptyState` on purpose — same card, same rhythm — so a failed
 * load reads as a state of the page rather than a different screen.
 */
export function UsersErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-6" strokeWidth={2} />
      </span>
      <h3 className="mt-4 text-base font-semibold text-foreground">
        Could not load users
      </h3>
      {/* `ApiError.message` is already sanitised for display; a raw upstream
          body would leak stack traces at 5xx. */}
      <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
        {isApiError(error)
          ? error.message
          : "Something went wrong. Please try again."}
      </p>
      <Button variant="outline" className="mt-6" onClick={onRetry}>
        Try again
      </Button>
    </Card>
  );
}
