"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ListChecks } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { cn } from "@/shared/lib/utils";

import { useNotifications } from "../_provider/notification-provider";
import { badgeText } from "../lib/notification-display";

/**
 * "What is waiting for me" — the attention summary.
 *
 * A different question from the bell. The bell says what HAPPENED; this says
 * what is still OPEN. That is why it is a second control rather than a tab
 * inside the first: one badge cannot mean both without becoming meaningless.
 * Unread notifications are excluded from these rows and from the badge — the
 * bell already owns that number.
 *
 * Every row comes from the API's own keys. A count this portal has no screen
 * for still appears, with its number, marked as such — the number is true even
 * when there is nowhere to send you, and hiding it would be a quieter lie.
 */
export function AttentionMenu() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const { attention, attentionCount } = useNotifications();

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const badge = badgeText(attentionCount);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          /* 36px below sm. The header already carries a menu button, the logo,
             the other control and the avatar; at 40 each these two push the
             row past 375px. Still above the 24px minimum touch target. */
          className="relative size-9 sm:size-10"
          aria-label={
            attentionCount > 0
              ? `Needs attention, ${attentionCount} items`
              : "Needs attention"
          }
        >
          <ListChecks className="size-5" />
          {badge ? (
            // Amber, not red: this is work waiting, not something that just
            // happened — and it must not read as a second unread count.
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold leading-none text-white">
              {badge}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Needs attention</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Open work on your account.
          </p>
        </div>

        <div className="max-h-[60vh] divide-y divide-border overflow-y-auto overscroll-contain">
          {attention.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nothing is waiting on you.
            </p>
          ) : (
            attention.map((row) => {
              const actionable = Boolean(row.href) && row.count > 0;

              return (
                <button
                  key={row.key}
                  type="button"
                  disabled={!actionable}
                  onClick={() => row.href && go(row.href)}
                  className={cn(
                    "flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors",
                    actionable
                      ? "text-foreground hover:bg-secondary/60"
                      : "cursor-default text-muted-foreground",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {row.label}
                    {/* A subset is counted inside another row above it, so it
                        says so rather than appearing to add to the total. */}
                    {row.isSubset ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        subset
                      </span>
                    ) : null}
                    {!row.href ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        (no screen yet)
                      </span>
                    ) : null}
                  </span>

                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                      row.count > 0
                        ? "bg-amber-50 text-amber-700"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {row.count}
                  </span>

                  {actionable ? (
                    <ChevronRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground"
                    />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
