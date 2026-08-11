"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Settings, User as UserIcon } from "lucide-react";

import { useSession } from "@/shared/auth/session-context";
import { logout } from "@/shared/api/services/auth.service";
import { displayName } from "@/shared/auth/types";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { getInitials } from "@/shared/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useSession();
  const [signingOut, setSigningOut] = React.useState(false);

  const name = displayName(user);
  const avatarUrl = user.image_thumbnail ?? user.image ?? undefined;

  function handleLogout() {
    setSigningOut(true);

    // Token, store, localStorage and cookies.
    logout();

    // Otherwise the next user on this machine sees the previous one's cached lists.
    queryClient.clear();

    // A client-side navigation. The old hard reload existed because the server
    // used to resolve the session; it no longer does, so there is nothing on
    // the server to re-render. `replace` keeps /dashboard out of history, so
    // Back cannot walk into a signed-out shell.
    router.replace("/login");
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 sm:pr-3"
          >
            <Avatar className="size-8">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={name} />
              ) : null}
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
            <span className="hidden font-medium text-foreground sm:inline">
              {name}
            </span>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>Signed in</DropdownMenuLabel>
          <div className="px-2.5 pb-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {name}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserIcon />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            disabled={signingOut}
            onSelect={handleLogout}
          >
            <LogOut />
            {signingOut ? "Signing out…" : "Log out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="outline"
        onClick={handleLogout}
        disabled={signingOut}
        className="hidden sm:inline-flex"
      >
        <LogOut className="size-4" />
        {signingOut ? "Signing out…" : "Logout"}
      </Button>
    </div>
  );
}
