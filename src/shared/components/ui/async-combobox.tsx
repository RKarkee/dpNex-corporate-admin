"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

/**
 * Searchable select over a paginated endpoint — HS codes, currencies,
 * materials, manufacturers, package types. These lists run to thousands of
 * rows, so they are searched server-side and paged in as the user scrolls.
 *
 * The caller stores the code, but the trigger has to show a name. Since the
 * label lives in a response this component may never have fetched (an edit
 * form opens with a stored code and no list), it is passed in as
 * `selectedLabel` rather than looked up here.
 *
 * `multiple` turns it into a checklist: the popover stays open, every row keeps
 * its tick, and `onChange` fires as a TOGGLE — the caller adds or removes.
 * Closing on each pick is right when there is one answer and wrong when there
 * are several, since it makes choosing five things five round trips through a
 * search box that has forgotten what you typed.
 */

export interface AsyncComboboxOption {
  value: string;
  label: string;
}

export interface AsyncComboboxPage {
  options: AsyncComboboxOption[];
  hasMore: boolean;
}

export interface AsyncComboboxProps {
  /** The chosen value in single mode; ignored when `multiple` is set. */
  value: string;
  /**
   * Checklist mode: the popover stays open and `onChange` is a toggle. Pass the
   * current set as `selectedValues` so every row can show its own state.
   */
  multiple?: boolean;
  selectedValues?: string[];
  /** What the trigger shows. Falls back to `value`, then to the placeholder. */
  selectedLabel?: string;
  onChange: (option: AsyncComboboxOption) => void;
  /** `query` is only non-empty once `minSearchLength` characters are typed. */
  fetchPage: (page: number, query: string) => Promise<AsyncComboboxPage>;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  minSearchLength?: number;
  debounceMs?: number;
  /** Lets the user submit text the endpoint does not know about. */
  allowCustomValue?: boolean;
  "aria-invalid"?: boolean;
}

export function AsyncCombobox({
  value,
  multiple = false,
  selectedValues,
  selectedLabel,
  onChange,
  fetchPage,
  placeholder = "Select…",
  searchPlaceholder = "Type at least 3 characters to search…",
  emptyText = "No results found.",
  disabled,
  className,
  minSearchLength = 3,
  debounceMs = 350,
  allowCustomValue = false,
  "aria-invalid": ariaInvalid,
}: AsyncComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [options, setOptions] = React.useState<AsyncComboboxOption[]>([]);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  /** Membership for the tick marks — the set in checklist mode, the one value otherwise. */
  const selected = React.useMemo(
    () => new Set(multiple ? (selectedValues ?? []) : value ? [value] : []),
    [multiple, selectedValues, value],
  );

  const listRef = React.useRef<HTMLDivElement>(null);
  /**
   * Only the newest request may write to state. Without this, a slow page-1
   * response landing after a fast page-2 would replace the list the user is
   * already scrolling.
   */
  const requestSeq = React.useRef(0);

  // A one- or two-character query would return most of the table; below the
  // threshold we ask for the unfiltered first page instead.
  const effectiveQuery =
    search.trim().length >= minSearchLength ? search.trim() : "";

  const loadPage = React.useCallback(
    async (targetPage: number, query: string, append: boolean) => {
      const seq = ++requestSeq.current;
      setLoading(true);

      try {
        const result = await fetchPage(targetPage, query);
        if (seq !== requestSeq.current) return;

        setOptions((previous) =>
          append ? [...previous, ...result.options] : result.options,
        );
        setHasMore(result.hasMore);
        setPage(targetPage);
      } catch {
        // The service already surfaced this; an empty list with the "no
        // results" row is the right thing to show inside the popover.
        if (seq === requestSeq.current && !append) {
          setOptions([]);
          setHasMore(false);
        }
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [fetchPage],
  );

  // Debounced re-search. Runs only while the popover is open, so a page with
  // twenty of these does not fire twenty requests on mount.
  React.useEffect(() => {
    if (!open) return;

    const timer = setTimeout(() => {
      void loadPage(1, effectiveQuery, false);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [open, effectiveQuery, debounceMs, loadPage]);

  const handleScroll = () => {
    const element = listRef.current;
    if (!element || loading || !hasMore) return;

    // 40px of runway, so the next page is already in flight by the time the
    // user reaches the bottom.
    const remaining =
      element.scrollHeight - element.scrollTop - element.clientHeight;
    if (remaining < 40) void loadPage(page + 1, effectiveQuery, true);
  };

  const commitCustomValue = () => {
    const custom = search.trim();
    if (!custom) return;
    onChange({ value: custom, label: custom });
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) return;

        // Reopen from a clean slate: a stale list from the previous search
        // would flash before the first page of this one arrives.
        setSearch("");
        setOptions([]);
        setHasMore(false);
        void loadPage(1, "", false);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid}
          disabled={disabled}
          className={cn(
            "h-11 w-full justify-between bg-secondary px-3.5 font-normal",
            "border-transparent hover:bg-secondary/80",
            "aria-invalid:border-destructive/50 aria-invalid:ring-2 aria-invalid:ring-destructive/20",
            !(multiple ? selected.size > 0 : value) && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">
            {selectedLabel || (multiple ? "" : value) || placeholder}
          </span>
          <ChevronsUpDown aria-hidden className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        // Picking a row moves focus inside the list; without this, Radix pulls
        // it back to the trigger on close and the page jumps.
        onOpenAutoFocus={(event) => multiple && event.preventDefault()}
      >
        {/* The endpoint already filtered; re-filtering here would hide rows it
            matched on a field we do not display. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList ref={listRef} onScroll={handleScroll}>
            {!loading && options.length === 0 ? (
              <CommandEmpty>
                {allowCustomValue && search.trim() ? (
                  <button
                    type="button"
                    onClick={commitCustomValue}
                    className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    Use &ldquo;{search.trim()}&rdquo;
                  </button>
                ) : (
                  emptyText
                )}
              </CommandEmpty>
            ) : null}

            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option);
                    // Checklist mode keeps the popover — and the search term —
                    // where they are, so a second pick costs one click.
                    if (!multiple) setOpen(false);
                  }}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      "mr-2 size-4",
                      selected.has(option.value) ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground">
                <Loader2 aria-hidden className="size-4 animate-spin" />
                Loading…
              </div>
            ) : null}

            {allowCustomValue && search.trim() && options.length > 0 ? (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={commitCustomValue}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-accent"
                >
                  Use &ldquo;{search.trim()}&rdquo; instead
                </button>
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
