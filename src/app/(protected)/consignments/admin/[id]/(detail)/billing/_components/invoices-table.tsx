"use client";

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
import { cn } from "@/shared/lib/utils";

import { formatInvoiceAmount, formatInvoiceDate } from "../_lib/format-invoice";
import type { Invoice } from "../types";
import { InvoiceRowActions } from "./invoice-row-actions";
import { InvoiceStatusBadge } from "./invoice-status-badge";

/**
 * Mirrors `billing-accounts/_components/invoices-table.tsx`. The "Billed to"
 * column is dropped here — every row already belongs to this one
 * consignment's account, so it would repeat the same name down the column.
 */
const COLUMNS = 5;

const STICKY_ACTIONS = "sticky right-0 border-l border-border/70 bg-inherit sm:static sm:border-l-0";

export interface InvoicesTableProps {
  consignmentId: number | string;
  invoices: Invoice[];
  onView: (invoice: Invoice) => void;
}

export function InvoicesTable({ consignmentId, invoices, onView }: InvoicesTableProps) {
  return (
    <div className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead>Invoice</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Due date</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {invoices.length === 0 ? (
            <TableEmpty colSpan={COLUMNS}>No invoices for this consignment yet.</TableEmpty>
          ) : null}

          {invoices.map((invoice) => (
            <TableRow key={invoice.id} className="bg-card">
              <TableCell className="max-w-40 sm:max-w-xs">
                <p className="truncate font-medium text-foreground">{invoice.invoice_no}</p>
                <p className="text-xs text-muted-foreground md:hidden">
                  Issued {formatInvoiceDate(invoice.invoice_date)}
                </p>
              </TableCell>

              <TableCell className="whitespace-nowrap">
                <p className="font-medium text-foreground">
                  {formatInvoiceAmount(invoice.amounts.payable, invoice.currency)}
                </p>
                {Number(invoice.amounts.outstanding) > 0 ? (
                  <p className="text-xs text-destructive">
                    {formatInvoiceAmount(invoice.amounts.outstanding, invoice.currency)} due
                  </p>
                ) : null}
              </TableCell>

              <TableCell>
                <InvoiceStatusBadge status={invoice.status} label={invoice.status_label} />
              </TableCell>

              <TableCell className="hidden whitespace-nowrap text-muted-foreground md:table-cell">
                {formatInvoiceDate(invoice.due_date)}
              </TableCell>

              <TableCell className={cn("w-px", STICKY_ACTIONS)}>
                <div className="flex justify-end">
                  <InvoiceRowActions consignmentId={consignmentId} invoice={invoice} onView={onView} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/** Placeholder rows, sized to the real ones so the layout does not jump. */
export function InvoicesTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-card hover:bg-transparent">
            <TableHead>Invoice</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Due date</TableHead>
            <TableHead className={cn("text-right", STICKY_ACTIONS)}>Action</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody aria-hidden>
          {Array.from({ length: rows }, (_, index) => (
            <TableRow key={index} className="bg-card hover:bg-transparent">
              <TableCell>
                <Skeleton className="h-3.5 w-28" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-3.5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16 rounded-full" />
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Skeleton className="h-3.5 w-24" />
              </TableCell>
              <TableCell className={cn("w-px", STICKY_ACTIONS)}>
                <div className="flex justify-end">
                  <Skeleton className="size-9 rounded-md" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
