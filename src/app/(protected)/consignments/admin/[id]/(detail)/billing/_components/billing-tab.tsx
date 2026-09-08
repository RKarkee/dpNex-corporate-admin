"use client";

import * as React from "react";
import { CalendarRange, Receipt, Search } from "lucide-react";

import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Pagination } from "@/shared/components/ui/pagination";

import { useConsignmentInvoices } from "../_hooks/use-consignment-invoices";
import type { Invoice } from "../types";
import { BillingSummary } from "./billing-summary";
import { InvoicesErrorState } from "./invoices-error-state";
import { InvoicesTable, InvoicesTableSkeleton } from "./invoices-table";
import { StatementDialog } from "./statement-dialog";

const PER_PAGE = 10;

/** Does this row match what was typed? Mirrors `InvoicesView`'s `matches`. */
function matches(invoice: Invoice, term: string): boolean {
  const haystack: string[] = [invoice.invoice_no, invoice.status_label];
  return haystack.some((value) => value.toLowerCase().includes(term));
}

/**
 * The Billing tab: this consignment's own bills.
 *
 * A standalone sibling of `billing-accounts` — same list/detail/PDF/summary/
 * statement feature set, scoped to one consignment via
 * `/corporate/consignments/{id}/billings`. "View bill" opens its own page
 * (`/consignments/admin/{id}/billing/{invoiceId}`, outside the tab shell) —
 * a bill is a document to read or print, not a record best viewed inline.
 * "Bill statement" stays a dialog, following the same convention the
 * Documents and Boxes tabs use for viewing something from within a tab
 * without leaving it.
 */
export function BillingTab({ consignmentId }: { consignmentId: string }) {
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState("");
  const [statementOpen, setStatementOpen] = React.useState(false);

  const { data, isPending, isError, error, isFetching, refetch } = useConsignmentInvoices(
    consignmentId,
    page,
    PER_PAGE,
  );

  const term = search.trim().toLowerCase();

  // Filtered in the browser, over the rows this page already returned — same
  // choice `InvoicesView` makes for the corporate-wide list.
  const visible = React.useMemo(() => {
    const items = data?.items ?? [];
    return term ? items.filter((invoice) => matches(invoice, term)) : items;
  }, [data?.items, term]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold text-foreground">Billing</h3>
          <p className="text-sm text-muted-foreground">
            Invoices billed against this consignment.
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setStatementOpen(true)}>
          <CalendarRange className="size-4" />
          Bill statement
        </Button>
      </div>

      <BillingSummary consignmentId={consignmentId} />

      {isPending ? (
        <InvoicesTableSkeleton />
      ) : isError ? (
        <InvoicesErrorState error={error} onRetry={() => void refetch()} />
      ) : data.items.length === 0 && !term ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description="Invoices billed against this consignment will appear here once they are issued."
        />
      ) : (
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

            <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
              <InvoicesTable consignmentId={consignmentId} invoices={visible} />
            </div>

            <div className="border-t border-border px-4">
              <Pagination
                meta={
                  term
                    ? {
                        page: 1,
                        pageCount: 1,
                        perPage: visible.length,
                        total: visible.length,
                        from: visible.length === 0 ? null : 1,
                        to: visible.length === 0 ? null : visible.length,
                      }
                    : data.meta
                }
                onPageChange={setPage}
                disabled={isFetching}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <StatementDialog
        consignmentId={consignmentId}
        open={statementOpen}
        onOpenChange={setStatementOpen}
      />
    </div>
  );
}
