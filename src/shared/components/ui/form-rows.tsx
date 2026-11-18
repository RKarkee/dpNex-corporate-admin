import * as React from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * Repeating form rows that read as a table where there is room, and as stacked
 * cards where there is not.
 *
 * One set of controls, two arrangements. The switch is pure CSS — a container
 * query on the wrapper — so nothing is mounted twice or swapped out: a value
 * typed while the table is showing is the same input when the window narrows
 * and the cards take over, and focus, open dropdowns and react-hook-form
 * registrations are untouched by the change.
 *
 * It switches on the space the rows actually have (`@3xl`, 48rem), not the
 * viewport, so the same rows work inside a page card and inside a dialog.
 *
 * - **Wide:** a header row carries the column labels; each entry is one grid
 *   row; the first column stays pinned while the rest scroll sideways when the
 *   columns need more room than there is.
 * - **Narrow:** each entry is a card titled by `FormRow`'s `title`, its fields
 *   labelled one by one.
 *
 * Fields inside should hide their own label at the wide size, since the header
 * carries it — `FieldShell`'s `tableCell` does that, keeping the label for
 * screen readers.
 */

export interface FormRowsColumn {
  label: string;
  required?: boolean;
  /** The narrowest the column may get, in rem. */
  minRem: number;
  /** Its share of any spare width. Default 1. */
  grow?: number;
}

/** Width of the trailing remove-button column, in rem. */
const ACTION_REM = 2.25;
/** Column gap at the wide size, in rem — matches `gap-x-3`. */
const GAP_REM = 0.75;
/** Row padding at the wide size, in rem — matches `px-3` on both sides. */
const PADDING_REM = 1.5;

/**
 * Class for the column to keep in view while the others scroll sideways.
 *
 * Pinned at the scroll edge, so its background is pulled out over the row's
 * left padding (`-ml-3 pl-3`) — otherwise the cell would jump 12px left as
 * scrolling starts. The shadow is the row's own background, extended into the
 * column gap, so scrolled cells pass under a clean edge instead of butting
 * against the field.
 */
export const FORM_ROW_PINNED_CELL =
  "@3xl:sticky @3xl:left-0 @3xl:z-10 @3xl:-ml-3 @3xl:bg-card @3xl:pl-3 @3xl:shadow-[0.75rem_0_0_0_var(--card)]";

/** The header's counterpart to `FORM_ROW_PINNED_CELL`, on its own background. */
const PINNED_HEADER_CELL =
  "@3xl:sticky @3xl:left-0 @3xl:z-10 @3xl:-ml-3 @3xl:bg-secondary @3xl:pl-3 @3xl:shadow-[0.75rem_0_0_0_var(--secondary)]";

export function FormRows({
  columns,
  children,
  className,
}: {
  columns: FormRowsColumn[];
  children: React.ReactNode;
  className?: string;
}) {
  const template = [
    ...columns.map((column) => `minmax(${column.minRem}rem,${column.grow ?? 1}fr)`),
    `${ACTION_REM}rem`,
  ].join(" ");

  const minWidth =
    columns.reduce((sum, column) => sum + column.minRem, 0) +
    ACTION_REM +
    GAP_REM * columns.length +
    PADDING_REM;

  const style = {
    "--form-rows-cols": template,
    "--form-rows-min": `${minWidth}rem`,
  } as React.CSSProperties;

  return (
    <div className={cn("@container", className)}>
      <div
        style={style}
        className="@3xl:overflow-x-auto @3xl:rounded-lg @3xl:border @3xl:border-border @3xl:bg-card"
      >
        <div className="space-y-3 @3xl:min-w-(--form-rows-min) @3xl:space-y-0">
          {/* Visual only: each field keeps its own label for screen readers. */}
          <div
            aria-hidden
            className="hidden border-b border-border bg-secondary px-3 py-2 text-xs font-semibold text-muted-foreground @3xl:grid @3xl:grid-cols-(--form-rows-cols) @3xl:gap-x-3"
          >
            {columns.map((column, index) => (
              <div
                key={column.label}
                className={cn(
                  "truncate",
                  index === 0 && PINNED_HEADER_CELL,
                )}
              >
                {column.label}
                {column.required ? <span className="ml-0.5 text-destructive">*</span> : null}
              </div>
            ))}
            <div />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

export interface FormRowProps {
  /** The card heading at the narrow size — "Item 2". */
  title: string;
  onRemove: () => void;
  /** Accessible name of the remove button — "Remove item 2". */
  removeLabel: string;
  canRemove?: boolean;
  disabled?: boolean;
  /** The cells, in the same order as `FormRows`' columns. */
  children: React.ReactNode;
}

/**
 * One entry. The remove button is rendered twice — in the card heading and in
 * the row's last column — and CSS shows one; it holds no state, so nothing is
 * lost by the duplicate. The fields themselves render once.
 */
export function FormRow({
  title,
  onRemove,
  removeLabel,
  canRemove = true,
  disabled,
  children,
}: FormRowProps) {
  const removeButton = (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      onClick={onRemove}
      disabled={disabled || !canRemove}
      aria-label={removeLabel}
      title={removeLabel}
      className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
    >
      <Trash2 aria-hidden className="size-3.5" />
    </Button>
  );

  return (
    <div className="rounded-lg border border-border bg-card @3xl:rounded-none @3xl:border-0 @3xl:border-b @3xl:last:border-b-0">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2 @3xl:hidden">
        <span className="text-xs font-semibold text-muted-foreground">{title}</span>
        {removeButton}
      </div>

      <div className="grid gap-4 p-4 @xl:grid-cols-2 @3xl:grid-cols-(--form-rows-cols) @3xl:items-start @3xl:gap-x-3 @3xl:gap-y-0 @3xl:px-3 @3xl:py-2.5">
        {children}
        <div className="hidden @3xl:flex @3xl:justify-end @3xl:pt-1">{removeButton}</div>
      </div>
    </div>
  );
}
