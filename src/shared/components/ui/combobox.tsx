"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

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
 * Searchable select over a list already in memory — countries, states, cities,
 * and the enum lists that arrive with `/meta`.
 *
 * For anything paginated behind an endpoint, use `AsyncCombobox` instead.
 */

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  /**
   * Lets the user keep text that matches no option. On for the lists the API
   * accepts free values for (quantity codes); off for country, where a typo
   * would be sent as an ISO code and rejected.
   */
  allowCustomValue?: boolean;
  "aria-invalid"?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  disabled,
  className,
  allowCustomValue = true,
  "aria-invalid": ariaInvalid,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  // A value with no matching option is either a free-typed entry or a code
  // whose list has not loaded — either way, showing it beats showing nothing.
  const selected = options.find((option) => option.value === value);
  const displayLabel = selected?.label ?? value;

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query),
    );
  }, [options, search]);

  const commitCustomValue = () => {
    const custom = search.trim();
    if (!custom) return;
    onChange(custom);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Reset on open, not on close — clearing while the panel animates out
        // makes the list visibly re-render as it disappears.
        if (next) setSearch("");
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
            !value && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayLabel || placeholder}</span>
          <ChevronsUpDown aria-hidden className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        {/* Filtering happens above, so cmdk's own matcher is turned off —
            leaving both on would score the list twice with different rules. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {allowCustomValue && search.trim() ? (
                <button
                  type="button"
                  onClick={commitCustomValue}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-brand-crimson-surface"
                >
                  Use &ldquo;{search.trim()}&rdquo;
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>

            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <Check
                    aria-hidden
                    className={cn(
                      "mr-2 size-4",
                      value === option.value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* The escape hatch when the typed text *does* match something but
                the user meant it literally. */}
            {allowCustomValue && search.trim() && filtered.length > 0 ? (
              <div className="border-t border-border p-1">
                <button
                  type="button"
                  onClick={commitCustomValue}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-muted-foreground hover:bg-brand-crimson-surface"
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
