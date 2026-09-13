"use client";

import { CheckCheck } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import { useNotifications } from "../_provider/notification-provider";

/**
 * "Mark all read", for the page header.
 *
 * Reads the shared provider so the count it disables against is the same one
 * the bell shows — a button that is live while the badge says zero is a
 * disagreement the user has to resolve for themselves.
 */
export function MarkAllReadButton() {
  const { unseenCount, markAllRead, isMarkingAll } = useNotifications();

  return (
    <Button
      variant="outline"
      onClick={markAllRead}
      disabled={isMarkingAll || unseenCount === 0}
      title={unseenCount === 0 ? "Everything is already read" : undefined}
    >
      <CheckCheck className="size-4" />
      Mark all read
    </Button>
  );
}
