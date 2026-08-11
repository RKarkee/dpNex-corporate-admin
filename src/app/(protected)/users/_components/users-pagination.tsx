"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import type { PageMeta } from "@/shared/api/types";
import { Button } from "@/shared/components/ui/button";

/**
 * Previous / Next over the API's own `meta` block.
 *
 * Numbered page buttons are deliberately absent — `meta.links` carries them,
 * but they only earn their space once someone needs to jump deep into a list.
 */
export function UsersPagination({
  page,
  meta,
  busy,
  onPageChange,
}: {
  page: number;
  meta: PageMeta | undefined;
  /** A fetch is in flight — both buttons lock so pages cannot be skipped. */
  busy: boolean;
  onPageChange: (page: number) => void;
}) {
  const pageCount = meta?.pageCount ?? 1;
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Users pagination"
      className="flex items-center justify-between gap-4"
    >
      <p aria-live="polite" className="text-sm text-muted-foreground">
        Page {meta?.page ?? page} of {pageCount}
        {meta?.total ? ` · ${meta.total} users` : null}
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1 || busy}
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount || busy}
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}
