"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";

/**
 * A read-only labelled grid in a modal — used to inspect one box or one item
 * without leaving the detail page.
 *
 * Rows are data rather than children so callers can build them from a record
 * with a `.map`, and so "empty" is decided in one place: `0` and `false` are
 * values worth showing, `""`, `null` and `undefined` are not.
 */

export interface DetailRow {
  label: string;
  value?: React.ReactNode;
  /** Spans both columns — for descriptions and anything else that wraps. */
  full?: boolean;
}

function isEmpty(value: React.ReactNode): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

export interface DetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  loading?: boolean;
  rows: DetailRow[];
}

export function DetailDialog({
  open,
  onOpenChange,
  title,
  loading,
  rows,
}: DetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <dl className="mt-4 grid grid-cols-2 gap-4">
            {rows.map((row) => (
              <div
                key={row.label}
                className={cn("space-y-0.5", row.full && "col-span-2")}
              >
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  {row.label}
                </dt>
                <dd className="break-words text-sm font-medium text-foreground">
                  {isEmpty(row.value) ? "—" : row.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </DialogContent>
    </Dialog>
  );
}
