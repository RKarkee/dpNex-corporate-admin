"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  /** Desktop rail collapsed to icons only. Persisted — it is a preference. */
  collapsed: boolean;
  /** Mobile drawer open state. Never persisted; a drawer is not a preference. */
  mobileOpen: boolean;
  /** Titles of expanded collapsible parents. */
  openGroups: string[];

  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
  /** Expand and, in the same tick, open a group — the collapsed-icon click. */
  expandWithGroup: (title: string) => void;

  setMobileOpen: (value: boolean) => void;
  toggleMobile: () => void;

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

      toggleCollapsed: () =>
        set((state) => ({ collapsed: !state.collapsed })),

      setCollapsed: (value) => set({ collapsed: value }),

      expandWithGroup: (title) =>
        set((state) => ({
          collapsed: false,
          openGroups: state.openGroups.includes(title)
            ? state.openGroups
            : [...state.openGroups, title],
        })),

      setMobileOpen: (value) => set({ mobileOpen: value }),
      toggleMobile: () => set((state) => ({ mobileOpen: !state.mobileOpen })),

      toggleGroup: (title) =>
        set((state) => ({
          openGroups: state.openGroups.includes(title)
            ? state.openGroups.filter((t) => t !== title)
            : [...state.openGroups, title],
        })),

      setGroupOpen: (title, open) =>
        set((state) => {
          const has = state.openGroups.includes(title);
          if (open === has) return state; // no-op, so React skips the render
          return {
            openGroups: open
              ? [...state.openGroups, title]
              : state.openGroups.filter((t) => t !== title),
          };
        }),
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
