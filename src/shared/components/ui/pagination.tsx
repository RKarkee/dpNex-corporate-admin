"use client";

import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import type { PageMeta } from "@/shared/api/types";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * Pagination driven by the API's own `meta` block.
 *
 * The page numbers are computed here rather than rendered from Laravel's
 * `meta.links`, whose labels arrive HTML-escaped (`&laquo; Previous`) and
 * whose window is fixed server-side.
 */

/**
 * Page numbers with ellipses, always the same width so the row does not
 * jump as you page through: 1 … 4 5 [6] 7 8 … 20
 */
function pageWindow(current: number, total: number): (number | "gap")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set<number>([1, total, current]);
  for (const offset of [-1, 1]) {
    const page = current + offset;
    if (page > 1 && page < total) pages.add(page);
  }

  // Keep the row a constant 7 slots even at the ends, where the window is
  // one-sided and would otherwise render short.
  if (current <= 3) for (const p of [2, 3, 4]) if (p < total) pages.add(p);
  if (current >= total - 2) {
    for (const p of [total - 3, total - 2, total - 1]) if (p > 1) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: (number | "gap")[] = [];

  for (const [index, page] of sorted.entries()) {
    const previous = sorted[index - 1];
    if (previous !== undefined && page - previous > 1) result.push("gap");
    result.push(page);
  }

  return result;
}

export interface PaginationProps {
  meta: PageMeta | undefined;
  onPageChange: (page: number) => void;
  /** Dims the control while a page is loading, without collapsing the layout. */
  disabled?: boolean;
  className?: string;
}

export function Pagination({
  meta,
  onPageChange,
  disabled = false,
  className,
}: PaginationProps) {
  // Nothing to page through and nothing to count.
  if (!meta || meta.total === 0) return null;

  /**
   * The controls render on a single page too, disabled at both ends.
   *
   * Hiding them below two pages meant a short list showed no pagination at
   * all — which reads as "this feature is missing" rather than "you are on
   * the only page". It also made the footer jump in and out of existence as a
   * search narrowed the result set.
   */
  const pages = pageWindow(meta.page, meta.pageCount);

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col items-center justify-between gap-3 py-3 sm:flex-row",
        disabled && "pointer-events-none opacity-60",
        className,
      )}
    >
      <p className="text-sm text-muted-foreground">
        <ResultRange meta={meta} />
      </p>

      <div className="flex items-center gap-1">
        {/* Jump to the ends. Without these, coming back from page 9 is eight
            clicks — and the numbered buttons that would have made it one are
            hidden on a phone. */}
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(1)}
          disabled={meta.page <= 1}
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="size-4" />
        </Button>

        {/*
          Seven numbered buttons plus two arrows need ~330px. On a 360px phone
          that overflows the card once padding is counted, so below `sm` the
          numbers collapse to a single "Page x of y" and paging is done with
          the arrows.
        */}
        <span className="px-2 text-sm tabular-nums text-muted-foreground sm:hidden">
          Page <span className="font-medium text-foreground">{meta.page}</span> of{" "}
          <span className="font-medium text-foreground">{meta.pageCount}</span>
        </span>

        <div className="hidden items-center gap-1 sm:flex">
          {pages.map((page, index) =>
            page === "gap" ? (
              <span
                // Index is safe here: the array is derived, never reordered.
                key={`gap-${index}`}
                aria-hidden
                className="grid size-9 place-items-center text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === meta.page ? "default" : "outline"}
                size="icon-sm"
                onClick={() => onPageChange(page)}
                aria-label={`Page ${page}`}
                aria-current={page === meta.page ? "page" : undefined}
                className="tabular-nums"
              >
                {page}
              </Button>
            ),
          )}
        </div>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.pageCount}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="size-4" />
        </Button>

        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPageChange(meta.pageCount)}
          disabled={meta.page >= meta.pageCount}
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </nav>
  );
}

function ResultRange({ meta }: { meta: PageMeta }) {
  if (meta.total === 0) return <>No results</>;

  // `from`/`to` are null on an empty page; fall back to a computed range.
  const from = meta.from ?? (meta.page - 1) * meta.perPage + 1;
  const to = meta.to ?? Math.min(meta.page * meta.perPage, meta.total);

  return (
    <>
      Showing <span className="font-medium text-foreground">{from}</span>–
      <span className="font-medium text-foreground">{to}</span> of{" "}
      <span className="font-medium text-foreground">{meta.total}</span>
    </>
  );
}
