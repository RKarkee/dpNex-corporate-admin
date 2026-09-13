"use client";

import * as React from "react";

import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useMetaOptions } from "@/shared/hooks/use-meta-options";
import { cn } from "@/shared/lib/utils";

import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "../_hooks/use-notification-preferences";
import { humanize } from "../types";

/**
 * Which channels may be used to reach this user.
 *
 * The channel list comes from `/meta` and the values from the preferences
 * endpoint — nothing here enumerates either. A channel `/meta` publishes but
 * the preferences endpoint has not stored is still shown (at its default), and
 * a stored channel `/meta` has not heard of is shown too, humanised: between
 * them those two rules mean a new channel appears on this screen the day it
 * exists, without a release.
 */

/** A switch. Local because it is the only one in the app so far. */
function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-secondary",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-block size-5 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function ChannelPreferences() {
  const { data, isPending, isError } = useNotificationPreferences();
  const { notificationChannelOptions } = useMetaOptions();
  const update = useUpdateNotificationPreference();

  /** `/meta` for the wording, the API for the values — merged, neither dropped. */
  const rows = React.useMemo(() => {
    const stored = new Map((data ?? []).map((row) => [row.channel, row]));
    const labels = new Map(
      notificationChannelOptions.map((option) => [option.value, option.label]),
    );

    const keys = [
      ...notificationChannelOptions.map((option) => option.value),
      ...(data ?? []).map((row) => row.channel),
    ];

    const seen = new Set<string>();

    return keys
      .filter((key) => {
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((key) => {
        const row = stored.get(key);
        return {
          channel: key,
          label: labels.get(key) ?? humanize(key),
          isEnabled: row?.is_enabled ?? false,
          isDefault: row?.is_default ?? true,
          // A channel `/meta` names but the API never returned has nothing to
          // write to, so it is shown without a working switch.
          isKnown: Boolean(row),
        };
      });
  }, [data, notificationChannelOptions]);

  if (isPending) {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          {Array.from({ length: 4 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">
            Could not load your channel preferences.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li
              key={row.channel}
              className="flex items-center gap-4 px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                  {row.label}
                  {/* No endpoint puts a channel back to its default, so this
                      reports the state rather than offering an action. */}
                  {row.isDefault ? (
                    <Badge variant="secondary">Default</Badge>
                  ) : null}
                </p>

                {row.channel === "PUSH" ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Only reaches devices registered below.
                  </p>
                ) : null}
              </div>

              <Toggle
                checked={row.isEnabled}
                disabled={!row.isKnown || update.isPending}
                onChange={(next) =>
                  update.mutate({ channel: row.channel, is_enabled: next })
                }
                label={`${row.label} notifications`}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
