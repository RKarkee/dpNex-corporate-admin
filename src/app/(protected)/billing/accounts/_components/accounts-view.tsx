"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Landmark, TriangleAlert } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { EmptyState } from "@/shared/components/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";

import { useBillingAccounts } from "../_hooks/use-billing-accounts";
import {
  buildListQuery,
  DEFAULT_FILTERS,
  hasActiveFilters,
  parseListState,
  type BillingAccountListState,
} from "../lib/account-params";
import type { BillingAccountFilterValues } from "../types";
import { AccountFilters } from "./account-filters";
import { AccountsTable, AccountsTableSkeleton } from "./accounts-table";
import { DefaultAccountDialog, type DefaultAccountAction } from "./default-account-dialog";

/**
 * The billing account list: filters, table, pagination and the states it can
 * be in. The URL is the single source of truth for filters and paging.
 */
export function AccountsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { filters, page, perPage } = parseListState(searchParams);
  const { data, isPending, isError, error, isFetching, refetch } =
    useBillingAccounts(page, filters, perPage);

  const [pendingAction, setPendingAction] = React.useState<DefaultAccountAction | null>(
    null,
  );

  /*
   * `replace`, not `push`: paging or tweaking a filter should not bury the
   * page the user arrived from under a dozen history entries.
   */
  const commit = (next: BillingAccountListState) => {
    const query = buildListQuery(next);
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  // A narrowed result set almost never has the page the user was on.
  // Clear resets the filters only — the row count is a display choice, not a
  // filter, and keeping it is what the user would expect.
  const applyFilters = (next: BillingAccountFilterValues) =>
    commit({ filters: next, page: 1, perPage });
  const resetFilters = () => commit({ filters: DEFAULT_FILTERS, page: 1, perPage });
  const handlePageChange = (nextPage: number) => commit({ filters, page: nextPage, perPage });
  const handlePerPageChange = (next: number) => commit({ filters, page: 1, perPage: next });

  const items = data?.items ?? [];

  // Mounted through every state, so Apply never tears the controls down.
  const bar = (
    <AccountFilters
      value={filters}
      onApply={applyFilters}
      onReset={resetFilters}
      perPage={perPage}
      onPerPageChange={handlePerPageChange}
      disabled={isPending}
    />
  );

  if (isPending) {
    return (
      <div className="space-y-6">
        {bar}
        <AccountsTableSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        {bar}
        <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
          <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
            <TriangleAlert className="size-6" strokeWidth={2} />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">
            Could not load billing accounts
          </h3>
          <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
            {isApiError(error) ? error.message : "Something went wrong. Please try again."}
          </p>
          <Button variant="outline" className="mt-6" onClick={() => void refetch()}>
            Try again
          </Button>
        </Card>
      </div>
    );
  }

  // Only when the unfiltered list is empty; filters matching nothing get a
  // "no match" row inside the table instead.
  if (items.length === 0 && !hasActiveFilters(filters)) {
    return (
      <div className="space-y-6">
        {bar}
        <EmptyState
          icon={Landmark}
          title="No billing accounts yet"
          description="Billing accounts set up for your corporate will appear here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bar}

      <Card>
        <CardContent className="p-0">
          <div className={isFetching ? "opacity-60 transition-opacity" : undefined}>
            <AccountsTable
              accounts={items}
              onMakeDefault={(account) => setPendingAction({ kind: "mark", account })}
              onRemoveDefault={(account) => setPendingAction({ kind: "remove", account })}
            />
          </div>

          <div className="border-t border-border px-4">
            <Pagination meta={data.meta} onPageChange={handlePageChange} disabled={isFetching} />
          </div>
        </CardContent>
      </Card>

      <DefaultAccountDialog action={pendingAction} onClose={() => setPendingAction(null)} />
    </div>
  );
}
