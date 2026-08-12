"use client";

import { initials, isDisabled, type User } from "@/shared/auth/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { useFileUrl } from "@/shared/hooks/use-file-url";
import { cn } from "@/shared/lib/utils";

/**
 * The profile picture, with initials as the fallback and a status dot.
 *
 * `alt=""` on purpose: the name sits in the very next column, so a description
 * here would make a screen reader announce the same person twice.
 *
 * The dot is the only status signal on a phone, where the Status column drops
 * out to leave room for the row actions. Colour cannot carry that alone —
 * hence the `sr-only` word for assistive tech, and the table spelling
 * "Disabled" out under the name for anyone looking at the screen.
 */
export function UserAvatar({ user }: { user: User }) {
  const off = isDisabled(user);

  // `user.image_thumbnail` is an authenticated endpoint, not a file — see
  // `useFileUrl`. Until it resolves, `src` is null and the initials show.
  const { src } = useFileUrl(user.image_thumbnail ?? user.image);

  return (
    <span className="relative inline-flex">
      <Avatar>
        {src ? <AvatarImage src={src} alt="" /> : null}
        <AvatarFallback>{initials(user)}</AvatarFallback>
      </Avatar>

      {/* `ring-card`, not a border: the dot sits half over the avatar's edge,
          and a ring in the card's own colour is what separates the two. */}
      <span
        aria-hidden
        className={cn(
          "absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-card",
          off ? "bg-destructive" : "bg-success",
        )}
      />
      <span className="sr-only">{off ? "Disabled" : "Active"}</span>
    </span>
  );
}
