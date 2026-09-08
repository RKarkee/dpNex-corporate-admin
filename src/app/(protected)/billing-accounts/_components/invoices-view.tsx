"use client";

import * as React from "react";
import { Receipt, Search } from "lucide-react";

import type { PageMeta } from "@/shared/api/types";
import { EmptyState } from "@/shared/components/empty-state";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";

import { useInvoices } from "../_hooks/use-invoices";
import type { Invoice } from "../types";
import { InvoicesErrorState } from "./invoices-error-state";
import { InvoicesTable, InvoicesTableSkeleton } from "./invoices-table";

/**
 * Does this row match what was typed?
 *
 * Everything the table can show is searchable — invoice number, account,
 * status — so a term the user can see on screen always finds its row.
 * Compared lower-case; `term` arrives already lowered and trimmed.
 */
function matches(invoice: Invoice, term: string): boolean {
  const haystack: string[] = [
    invoice.invoice_no,
    invoice.buyer?.name ?? "",
    invoice.status_label,
  ];

  return haystack.some((value) => value.toLowerCase().includes(term));
}

/**
 * A `meta` block describing the filtered rows rather than the fetched page.
 *
 * The server counted the whole page; once rows are hidden in the browser,
 * "Showing 1–15 of 15" over four visible rows is simply wrong. Mirrors the
 * same helper in `UsersView`.
 */
function filteredMeta(count: number): PageMeta {
  return {
    page: 1,
    pageCount: 1,
    perPage: count,
    total: count,
    from: count === 0 ? null : 1,
    to: count === 0 ? null : count,
  };
}

/**
 * The invoice list: a search field, the table, and the four states it can be
 * in. Read-only — nothing here creates, edits or deletes a bill.
 */
export function InvoicesView() {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");

  const { data, isPending, isError, error, isFetching, refetch } = useInvoices(page);

  const term = search.trim().toLowerCase();

  // Filtered in the browser, so there is nothing to debounce — every
  // keystroke is a re-render, not a request.
  const visible = React.useMemo(() => {
    const items = data?.items ?? [];
    return term ? items.filter((invoice) => matches(invoice, term)) : items;
  }, [data?.items, term]);

  if (isPending) return <InvoicesTableSkeleton />;

  if (isError) {
    return <InvoicesErrorState error={error} onRetry={() => void refetch()} />;
  }

  // Only when the list itself is empty. A search that matches nothing is not
  // the same situation — that case gets a "no match" row inside the table.
  if (data.items.length === 0 && !term) {
    return (
      <EmptyState
        icon={Receipt}
        title="No invoices yet"
        description="Invoices for this corporate will appear here once they are issued."
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="border-b border-border p-4">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoices…"
              aria-label="Search invoices"
              className="h-10 pl-9"
            />
          </div>
        </div>

        {/* Dimmed rather than swapped for a skeleton: on a page change the old
            rows are still meaningful, and replacing them makes the page flicker. */}
        <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
          <InvoicesTable invoices={visible} />
        </div>

        {/* While filtering, the server's `meta` describes the unfiltered page,
            so the count is rebuilt from what is actually on screen. */}
        <div className="border-t border-border px-4">
          <Pagination
            meta={term ? filteredMeta(visible.length) : data.meta}
            onPageChange={setPage}
            disabled={isFetching}
          />
        </div>
      </CardContent>
    </Card>
  );
}
