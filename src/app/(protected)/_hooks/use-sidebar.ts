"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { useMediaQuery } from "@/shared/hooks/use-media-query";
import { useStoreHydrated } from "@/shared/hooks/use-store-hydrated";

import { useSidebarStore } from "../_store/sidebar-store";

/** Below this the rail is a drawer. Matches Tailwind's `lg`. */
export const DESKTOP_QUERY = "(min-width: 1024px)";

/** lg → xl. Wide enough for a rail, too narrow for a 272px one plus content. */
export const TIGHT_DESKTOP_QUERY =
  "(min-width: 1024px) and (max-width: 1279.98px)";

export const SIDEBAR_WIDTH = 272;
export const SIDEBAR_WIDTH_COLLAPSED = 76;

/**
 * Everything the shell needs to know about the sidebar, in one place, so the
 * rail and the main element cannot disagree about how wide it currently is.
 */
export function useSidebar() {
  const hydrated = useStoreHydrated(useSidebarStore);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);

  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  /**
   * Until the store rehydrates, `collapsed` is the default `false` for
   * everyone. Reporting that as final would render a 272px rail and then snap
   * to 76px a frame later for anyone who had collapsed it. Callers use
   * `ready` to hold the width transition off until the real value is known.
   */
  return {
    ready: hydrated,
    collapsed: hydrated ? collapsed : false,
    isDesktop,
    toggleCollapsed,
    setCollapsed,
    width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
  };
}

/**
 * Collapses the rail when the viewport drops into the tight band, and restores
 * it on the way back out.
 *
 * Only reacts to *changes*, never to the value on mount — otherwise it would
 * overwrite the user's saved preference on every page load.
 */
export function useResponsiveSidebar(): void {
  const setCollapsed = useSidebarStore((s) => s.setCollapsed);
  const tight = useMediaQuery(TIGHT_DESKTOP_QUERY);
  const previous = React.useRef<boolean | null>(null);

  React.useEffect(() => {
    if (previous.current !== null && previous.current !== tight) {
      setCollapsed(tight);
    }
    previous.current = tight;
  }, [tight, setCollapsed]);
}

/** `Cmd/Ctrl + B` toggles the rail — the shortcut people already expect. */
export function useSidebarShortcut(): void {
  const toggleCollapsed = useSidebarStore((s) => s.toggleCollapsed);
  const toggleMobile = useSidebarStore((s) => s.toggleMobile);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "b" && event.key !== "B") return;
      if (!event.metaKey && !event.ctrlKey) return;

      // Let the browser keep Cmd+B while the user is writing something.
      const target = event.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target?.tagName ?? "")) return;

      event.preventDefault();
      if (isDesktop) toggleCollapsed();
      else toggleMobile();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDesktop, toggleCollapsed, toggleMobile]);
}

/**
 * Closes the mobile drawer after a navigation.
 *
 * The drawer is not unmounted by the route change — it lives in the layout —
 * so without this it stays open over the page the user just picked.
 */
export function useCloseDrawerOnNavigate(): void {
  const pathname = usePathname();
  const setMobileOpen = useSidebarStore((s) => s.setMobileOpen);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);
}
