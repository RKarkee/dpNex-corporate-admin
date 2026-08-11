"use client";

import * as React from "react";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

import type { RoleOption } from "@/shared/api/services/roles.service";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

/**
 * Multi-select for roles: a trigger, a searchable panel, and chips underneath.
 *
 * Replaces the plain checkbox list, which did not scale — a corporate with
 * twenty roles pushed the submit button off the screen.
 *
 * Three things this does that a hand-rolled dropdown usually does not:
 *
 *   1. **The trigger is a real `<button>`.** A `<div role="combobox">` with an
 *      `onClick` is invisible to the keyboard and to a screen reader's forms
 *      list, no matter what the role attribute claims.
 *   2. **Select-all respects the search.** It acts on the filtered rows and
 *      *merges* with what is already selected, so filtering to "ops" and
 *      hitting Select all cannot silently drop the roles the filter hid.
 *   3. **Arrow keys work.** Focus stays in the search box and
 *      `aria-activedescendant` points at the highlighted row — the standard
 *      combobox pattern, so typing and navigating do not fight each other.
 */

export interface RoleMultiSelectProps {
  roles: RoleOption[];
  selected: number[];
  onChange: (next: number[]) => void;
  isPending?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  /** A server-side complaint about the `roles` field itself. */
  error?: string;
  disabled?: boolean;
  id?: string;
}

export function RoleMultiSelect({
  roles,
  selected,
  onChange,
  isPending = false,
  isError = false,
  onRetry,
  error,
  disabled = false,
  id = "role-multi-select",
}: RoleMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlighted, setHighlighted] = React.useState(0);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const query = search.trim().toLowerCase();

  const filtered = React.useMemo(
    () => roles.filter((role) => role.label.toLowerCase().includes(query)),
    [roles, query],
  );

  // A Set makes the per-row lookup O(1); with `includes` this is O(n²) over
  // the whole list on every keystroke.
  const selectedSet = React.useMemo(() => new Set(selected), [selected]);

  /**
   * Whether every *visible* row is selected.
   *
   * The naive version — `selected.length === filtered.length` — is wrong the
   * moment a search is active: two selected roles and two visible rows reads
   * as "all selected" even when they are different roles entirely.
   */
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((role) => selectedSet.has(role.id));

  /* ---------------------------------------------------------------- */
  /* Open / close                                                      */
  /* ---------------------------------------------------------------- */

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    // `mousedown`, not `click`: a click that starts inside the panel and ends
    // outside it (a drag over the list) should not close the panel.
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // Focus the search box on open; the panel is useless without it.
  React.useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  /**
   * Clamped during render, not corrected by an effect.
   *
   * Typing narrows the list, which can leave `highlighted` past the end. An
   * effect would fix that one render too late — long enough to render an
   * `aria-activedescendant` pointing at an element that no longer exists.
   */
  const activeIndex = Math.min(highlighted, Math.max(filtered.length - 1, 0));

  function openPanel() {
    setSearch("");
    setHighlighted(0);
    setOpen(true);
  }

  function close(returnFocus = true) {
    setOpen(false);
    setSearch("");
    if (returnFocus) triggerRef.current?.focus();
  }

  /* ---------------------------------------------------------------- */
  /* Selection                                                         */
  /* ---------------------------------------------------------------- */

  function toggle(roleId: number) {
    onChange(
      selectedSet.has(roleId)
        ? selected.filter((value) => value !== roleId)
        : [...selected, roleId],
    );
  }

  function toggleAllVisible() {
    const visibleIds = filtered.map((role) => role.id);

    if (allVisibleSelected) {
      // Remove only what is visible — selections hidden by the search stay.
      const remove = new Set(visibleIds);
      onChange(selected.filter((value) => !remove.has(value)));
      return;
    }

    // Merge rather than replace, for the same reason.
    onChange([...new Set([...selected, ...visibleIds])]);
  }

  /* ---------------------------------------------------------------- */
  /* Keyboard                                                          */
  /* ---------------------------------------------------------------- */

  function onSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlighted(filtered.length ? (activeIndex + 1) % filtered.length : 0);
        break;

      case "ArrowUp":
        event.preventDefault();
        setHighlighted(
          filtered.length ? (activeIndex - 1 + filtered.length) % filtered.length : 0,
        );
        break;

      case "Home":
        event.preventDefault();
        setHighlighted(0);
        break;

      case "End":
        event.preventDefault();
        setHighlighted(Math.max(filtered.length - 1, 0));
        break;

      case "Enter": {
        // Always prevented: this control usually sits inside a form, and Enter
        // in the search box would otherwise submit it.
        event.preventDefault();
        const role = filtered[activeIndex];
        if (role) toggle(role.id);
        break;
      }

      case "Escape":
        event.preventDefault();
        // A first Escape clears an active search, a second closes the panel —
        // less abrupt than losing the whole panel to a stray key.
        if (search) setSearch("");
        else close();
        break;

      case "Tab":
        setOpen(false);
        break;

      default:
        break;
    }
  }

  // Keep the highlighted row in view as the arrows move past the fold.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-highlighted="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  /* ---------------------------------------------------------------- */
  /* Render                                                            */
  /* ---------------------------------------------------------------- */

  if (isError) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-sm text-destructive">
          Roles could not be loaded.
        </p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  const listboxId = `${id}-listbox`;
  const busy = disabled || isPending;

  const summary = isPending
    ? "Loading roles…"
    : selected.length === 0
      ? "Select roles…"
      : `${selected.length} role${selected.length > 1 ? "s" : ""} selected`;

  return (
    <div ref={containerRef} className="relative w-full space-y-3">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={busy}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openPanel();
          }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 text-sm",
          "transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-60",
          error ? "border-destructive" : "border-input hover:border-primary/40",
        )}
      >
        <span
          className={cn(
            "truncate",
            selected.length === 0 ? "text-muted-foreground" : "font-medium text-foreground",
          )}
        >
          {summary}
        </span>

        {isPending ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
        ) : (
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 mt-2 w-full overflow-hidden rounded-lg border border-border",
            "bg-card shadow-card",
            "animate-in fade-in-0 zoom-in-95 duration-150",
          )}
        >
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setHighlighted(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder="Search roles…"
              aria-label="Search roles"
              aria-controls={listboxId}
              aria-activedescendant={
                filtered[activeIndex] ? `${id}-option-${filtered[activeIndex].id}` : undefined
              }
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {search ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  searchRef.current?.focus();
                }}
                aria-label="Clear search"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            aria-multiselectable
            aria-label="Roles"
            className="max-h-60 overflow-y-auto p-1.5"
          >
            {roles.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No roles have been set up for this corporate yet.
              </p>
            ) : filtered.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No roles match “{search}”.
              </p>
            ) : (
              filtered.map((role, index) => {
                const isSelected = selectedSet.has(role.id);
                const isHighlighted = index === activeIndex;

                return (
                  <div
                    key={role.id}
                    id={`${id}-option-${role.id}`}
                    role="option"
                    aria-selected={isSelected}
                    data-highlighted={isHighlighted}
                    onClick={() => toggle(role.id)}
                    onMouseEnter={() => setHighlighted(index)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                      isHighlighted && "bg-accent",
                      isSelected ? "font-medium text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {/* A visual box, not a real Checkbox: a nested interactive
                        element inside an option would take its own focus stop
                        and break the listbox's keyboard model. */}
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input",
                      )}
                    >
                      {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left">{role.label}</span>
                  </div>
                );
              })
            )}
          </div>

          {filtered.length > 0 ? (
            <div className="flex items-center justify-between border-t border-border bg-muted/50 px-3 py-2">
              <button
                type="button"
                onClick={toggleAllVisible}
                className="text-xs font-medium text-primary transition-opacity hover:opacity-75"
              >
                {allVisibleSelected ? "Deselect all" : "Select all"}
                {query ? " shown" : ""}
              </button>

              <button
                type="button"
                onClick={() => onChange([])}
                disabled={selected.length === 0}
                className={cn(
                  "text-xs font-medium text-muted-foreground transition-colors",
                  "hover:text-destructive disabled:pointer-events-none disabled:opacity-50",
                )}
              >
                Clear
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Chips. The panel only ever shows a count, so this is the one place
          the actual selection is legible without reopening anything. */}
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2 pt-1">
          {selected.map((roleId) => {
            const role = roles.find((entry) => entry.id === roleId);
            // A role assigned before it was deleted still has an id on the
            // user; showing the raw id beats rendering "undefined".
            const label = role?.label ?? `Role #${roleId}`;

            return (
              <li key={roleId}>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/10 py-1 pl-2.5 pr-1 text-xs font-medium text-primary">
                  {label}
                  <button
                    type="button"
                    onClick={() => toggle(roleId)}
                    disabled={busy}
                    aria-label={`Remove ${label}`}
                    className="rounded-full p-0.5 transition-colors hover:bg-card hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
