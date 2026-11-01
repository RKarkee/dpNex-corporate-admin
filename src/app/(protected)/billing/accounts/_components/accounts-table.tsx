"use client";

import Link from "next/link";

import { Card } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { formatDate } from "@/shared/lib/dates";
import { cn } from "@/shared/lib/utils";

import { accountTitle, formatLocation, primaryAddress, text } from "../lib/account-format";
import { isDefaultAccount, type BillingAccount } from "../types";
import { AccountStatusBadge, DefaultAccountBadge } from "./account-badges";
import { AccountRowActions, type AccountRowActionsProps } from "./account-row-actions";

/**
 * The billing account list.
 *
 * Nine columns do not fit a phone, so the code, PAN/VAT, contact, location and
 * created date drop out below their breakpoints. The code and the default
 * badge restack under the account name, so the two things that identify a row
 * stay visible at every width.
 */

/** Tighter gutters below `sm`, so the visible columns fit a 375px screen. */
const TABLE_DENSITY = "[&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4";

const STICKY_ACTIONS =
  "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

const COLUMNS = 9;

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

export interface AccountsTableProps
  extends Omit<AccountRowActionsProps, "account"> {
  accounts: BillingAccount[];
}

export function AccountsTable({ accounts, ...actions }: AccountsTableProps) {
  return (
    <div className="overflow-hidden">
      <Table className={TABLE_DENSITY}>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead className="hidden sm:table-cell">Code</TableHead>
            <TableHead>Account</TableHead>
            <TableHead className="hidden lg:table-cell">PAN / VAT</TableHead>
            <TableHead className="hidden xl:table-cell">Contact</TableHead>
            <TableHead className="hidden md:table-cell">Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Default</TableHead>
            <TableHead className="hidden xl:table-cell">Created</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {accounts.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>
              No billing accounts match these filters.
            </TableEmpty>
          ) : null}

          {accounts.map((account) => {
            const isDefault = isDefaultAccount(account);
            const code = text(account.billing_account_code);
            const legalName = text(account.legal_name);
            const pan = text(account.pan);
            const vat = text(account.vat);
            const email = text(account.email);
            const phone = text(account.phone_1);
            const location = formatLocation(primaryAddress(account));

            return (
              <TableRow key={account.id} className="bg-card">
                <TableCell className="hidden whitespace-nowrap font-mono text-xs sm:table-cell">
                  {code ?? <Dash />}
                </TableCell>

                <TableCell className="max-w-48 sm:max-w-64">
                  <Link
                    href={`/billing/accounts/${account.id}`}
                    className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {accountTitle(account)}
                  </Link>
                  {legalName ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{legalName}</p>
                  ) : null}
                  {/* Carries the dropped Code and Default columns on phones. */}
                  <div className="mt-1 flex items-center gap-1.5 sm:hidden">
                    {code ? (
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {code}
                      </span>
                    ) : null}
                    {isDefault ? <DefaultAccountBadge /> : null}
                  </div>
                </TableCell>

                <TableCell className="hidden text-xs lg:table-cell">
                  {pan || vat ? (
                    <div className="space-y-0.5">
                      <p>
                        <span className="text-muted-foreground">PAN </span>
                        {pan ?? "—"}
                      </p>
                      <p>
                        <span className="text-muted-foreground">VAT </span>
                        {vat ?? "—"}
                      </p>
                    </div>
                  ) : (
                    <Dash />
                  )}
                </TableCell>

                <TableCell className="hidden max-w-52 text-xs xl:table-cell">
                  {email || phone ? (
                    <div className="space-y-0.5">
                      {email ? <p className="truncate">{email}</p> : null}
                      {phone ? <p className="text-muted-foreground">{phone}</p> : null}
                    </div>
                  ) : (
                    <Dash />
                  )}
                </TableCell>

                <TableCell className="hidden whitespace-nowrap md:table-cell">
                  {location ?? <Dash />}
                </TableCell>

                <TableCell>
                  <AccountStatusBadge account={account} />
                </TableCell>

                <TableCell className="hidden sm:table-cell">
                  {isDefault ? <DefaultAccountBadge /> : <Dash />}
                </TableCell>

                <TableCell className="hidden whitespace-nowrap text-muted-foreground xl:table-cell">
                  {formatDate(account.created_at)}
                </TableCell>

                <TableCell className={cn("text-right", STICKY_ACTIONS)}>
                  <AccountRowActions account={account} {...actions} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

/** The same column rhythm with the cells blanked, so the page does not jump. */
export function AccountsTableSkeleton() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-3 p-4">
        {Array.from({ length: 6 }).map((_, row) => (
          <div key={row} className="flex items-center gap-4">
            <Skeleton className="hidden h-5 w-20 sm:block" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-28 md:block" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </Card>
  );
}
