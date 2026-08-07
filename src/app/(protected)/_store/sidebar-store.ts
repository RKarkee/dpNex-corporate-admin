"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  /** Desktop rail collapsed to icons only. */
  collapsed: boolean;
  /** Mobile drawer open state (never persisted). */
  mobileOpen: boolean;
  /** Titles of expanded collapsible parents. */
  openGroups: string[];
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
  setMobileOpen: (value: boolean) => void;
  toggleGroup: (title: string) => void;
  setGroupOpen: (title: string, open: boolean) => void;
}

/** Shell-only UI state. Scoped to the (protected) group because nothing else reads it. */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      mobileOpen: false,
      openGroups: ["Consignments"],
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (value) => set({ collapsed: value }),
      setMobileOpen: (value) => set({ mobileOpen: value }),
      toggleGroup: (title) =>
        set((state) => ({
          openGroups: state.openGroups.includes(title)
            ? state.openGroups.filter((t) => t !== title)
            : [...state.openGroups, title],
        })),
      setGroupOpen: (title, open) =>
        set((state) => ({
          openGroups: open
            ? Array.from(new Set([...state.openGroups, title]))
            : state.openGroups.filter((t) => t !== title),
        })),
    }),
    {
      name: "dpnex.sidebar",
      partialize: (state) => ({
        collapsed: state.collapsed,
        openGroups: state.openGroups,
      }),
    },
  ),
);
