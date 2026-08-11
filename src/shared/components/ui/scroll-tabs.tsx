"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/shared/lib/utils";

/**
 * A horizontally scrolling filter bar.
 *
 * Plain buttons rather than a headless tabs primitive: these filter a list
 * that stays on screen, they do not swap panels, so the roving-focus and
 * `aria-controls` wiring a real tablist implies would be a lie. `radiogroup`
 * describes it honestly — pick one of several.
 *
 * Also avoids adding `@radix-ui/react-tabs` for a row of buttons.
 */

export interface ScrollTabItem {
  value: string;
  label: string;
  /** Rendered as a subtle count pill after the label. */
  count?: number;
}

export interface ScrollTabsProps {
  items: ScrollTabItem[];
  value: string;
  onValueChange: (value: string) => void;
  "aria-label"?: string;
  className?: string;
}

const SCROLL_STEP = 200;

export function ScrollTabs({
  items,
  value,
  onValueChange,
  "aria-label": ariaLabel = "Filter",
  className,
}: ScrollTabsProps) {
  const listRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const sync = React.useCallback(() => {
    const el = listRef.current;
    if (!el) return;

    setCanScrollLeft(el.scrollLeft > 4);
    // The 4px slack absorbs sub-pixel widths, which otherwise leave the right
    // arrow enabled forever on a list that is already fully scrolled.
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    sync();

    // A resize changes what fits without firing `scroll`.
    const observer = new ResizeObserver(sync);
    observer.observe(el);

    el.addEventListener("scroll", sync, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", sync);
    };
  }, [sync, items.length]);

  // Keep the active chip in view when it changes from outside (e.g. a reset).
  React.useEffect(() => {
    const el = listRef.current;
    const active = el?.querySelector<HTMLElement>('[data-active="true"]');
    active?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);

  function scrollBy(direction: -1 | 1) {
    listRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: "smooth",
    });
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <ArrowButton
        direction="left"
        disabled={!canScrollLeft}
        onClick={() => scrollBy(-1)}
      />

      <div
        ref={listRef}
        role="radiogroup"
        aria-label={ariaLabel}
        className="scrollbar-none flex flex-1 items-center gap-1 overflow-x-auto scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item) => {
          const active = item.value === value;

          return (
            <button
              key={item.value}
              type="button"
              role="radio"
              aria-checked={active}
              data-active={active}
              onClick={() => onValueChange(item.value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium capitalize",
                "whitespace-nowrap transition-colors outline-none",
                "focus-visible:ring-2 focus-visible:ring-ring/30",
                active
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {item.label}
              {item.count !== undefined ? (
                <span
                  className={cn(
                    "rounded px-1 text-[10px] tabular-nums",
                    active ? "bg-white/20" : "bg-muted",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <ArrowButton
        direction="right"
        disabled={!canScrollRight}
        onClick={() => scrollBy(1)}
      />
    </div>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      // Hidden from assistive tech: the list is already reachable by Tab, and
      // an announced "scroll left" button is noise, not navigation.
      aria-hidden
      tabIndex={-1}
      className={cn(
        "shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors",
        "hover:bg-accent hover:text-foreground",
        // `invisible` not `hidden`: the row keeps its width, so the chips do
        // not shift sideways as the arrows come and go.
        disabled && "invisible",
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
