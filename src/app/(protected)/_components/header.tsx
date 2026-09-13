"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { routes, siteConfig } from "@/shared/config/site";

import { AttentionMenu } from "../notifications/_components/attention-menu";
import { NotificationBell } from "../notifications/_components/notification-bell";
import { useSidebarStore } from "../_store/sidebar-store";
import { UserMenu } from "./user-menu";

/**
 * Swap `public/dpnex-logo.svg` for the real artwork. Keep these dimensions in
 * step with the file's viewBox, or Next reserves the wrong box and the header
 * shifts as the image decodes.
 */
const LOGO = { src: "/dpnex-logo.svg", width: 168, height: 40 } as const;

export function Header() {
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:gap-3 sm:px-6">
      {/* Mobile: opens the drawer. Hidden on desktop, where the rail is fixed. */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      {/* No desktop collapse toggle here — the rail owns it, on its own border. */}

      <Link
        href={routes.dashboard}
        aria-label={`${siteConfig.name} home`}
        className="flex shrink-0 items-center rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        <Image
          src={LOGO.src}
          alt={siteConfig.name}
          width={LOGO.width}
          height={LOGO.height}
          // `priority` — it is above the fold on every page, so it should not
          // wait behind lazy-loaded content.
          priority
          // Height-locked, width auto: the intrinsic ratio is preserved without
          // hardcoding a width that the real logo may not share.
          className="h-9 w-auto"
        />
      </Link>

      {/*
        Two controls, two questions: the checklist is what is still OPEN, the
        bell is what HAPPENED. They sit together because they are read together,
        and they stay separate because one badge cannot mean both.
      */}
      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <AttentionMenu />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
