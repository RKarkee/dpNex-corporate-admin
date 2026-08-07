"use client";

import { Menu, Search } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

import { useSidebarStore } from "../_store/sidebar-store";
import { Brand } from "./brand";
import { UserMenu } from "./user-menu";

export function Header() {
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon-sm"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="lg:hidden">
        <Brand />
      </div>

      <div className="hidden max-w-sm flex-1 lg:block">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search shipments, users, consignments…"
            className="h-10 pl-9"
            aria-label="Search"
          />
        </div>
      </div>

      <div className="ml-auto flex items-center">
        <UserMenu />
      </div>
    </header>
  );
}
