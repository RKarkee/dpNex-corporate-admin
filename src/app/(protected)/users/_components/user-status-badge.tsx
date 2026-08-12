"use client";

import { isDisabled, type User } from "@/shared/auth/types";
import { Badge } from "@/shared/components/ui/badge";

/** Colour alone never carries the state — the word is the signal. */
export function UserStatusBadge({ user }: { user: User }) {
  const off = isDisabled(user);

  return (
    <Badge variant={off ? "destructive" : "success"}>
      {off ? "Disabled" : "Active"}
    </Badge>
  );
}
