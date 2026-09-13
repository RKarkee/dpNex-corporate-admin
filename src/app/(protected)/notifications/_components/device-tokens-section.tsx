"use client";

import * as React from "react";
import { Smartphone, Trash2 } from "lucide-react";

import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { formatDateTime } from "@/shared/lib/dates";

import {
  useDeleteDeviceToken,
  useDeviceTokens,
} from "../_hooks/use-device-tokens";
import { humanize, type DeviceToken } from "../types";

/**
 * The devices registered to receive push.
 *
 * Listing and removing only. Registering this browser needs a Firebase project,
 * a service worker and a permission prompt — its own piece of work — while
 * removal is useful on its own: it is how someone stops a phone they no longer
 * have from receiving their notifications.
 */

/** A push token is 150+ opaque characters; the ends are enough to tell two apart. */
function maskToken(token: string): string {
  const value = token.trim();
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

export function DeviceTokensSection() {
  const { data, isPending, isError } = useDeviceTokens();
  const remove = useDeleteDeviceToken();
  const [pending, setPending] = React.useState<DeviceToken | null>(null);

  if (isPending) {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          {Array.from({ length: 2 }).map((_, row) => (
            <div key={row} className="flex items-center gap-4">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="size-9" />
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
            Could not load your registered devices.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tokens = data ?? [];

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {tokens.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              No devices registered. Signing in to the mobile app registers it
              here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {tokens.map((token) => (
                <li key={token.id} className="flex items-center gap-4 px-5 py-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                    <Smartphone aria-hidden className="size-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                      {token.platform ? humanize(token.platform) : "Device"}
                      {token.last_used_at ? (
                        <Badge variant="secondary">
                          Last used {formatDateTime(token.last_used_at)}
                        </Badge>
                      ) : null}
                    </p>
                    {/* The full token in `title`, so it can be read when
                        someone genuinely needs to match one up. */}
                    <p
                      className="mt-0.5 truncate font-mono text-xs text-muted-foreground"
                      title={token.token}
                    >
                      {maskToken(token.token)}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setPending(token)}
                    disabled={remove.isPending}
                    aria-label="Remove this device"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title="Remove this device?"
        description={
          pending ? (
            <>
              It will stop receiving push notifications for your account. Signing
              in again on that device registers it back.
            </>
          ) : null
        }
        confirmLabel="Remove device"
        onConfirm={async () => {
          if (!pending) return;
          await remove.mutateAsync(pending.token);
        }}
      />
    </>
  );
}
