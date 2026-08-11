"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { isHrefActive, isNavItemActive } from "@/shared/config/navigation";
import type { NavItem } from "@/shared/config/nav-constant";
import { cn } from "@/shared/lib/utils";

import { useSidebarStore } from "../_store/sidebar-store";

interface SidebarNavProps {
  items: NavItem[];
  /** Icon-only rail (desktop collapsed). Never true inside the mobile drawer. */
  collapsed?: boolean;
  /** Called after any navigation — used to close the mobile drawer. */
  onNavigate?: () => void;
}

export function SidebarNav({
  items,
  collapsed = false,
  onNavigate,
}: SidebarNavProps) {
  const pathname = usePathname();

  if (items.length === 0) {
    // Only reachable if the permission map excludes literally everything.
    // A blank rail reads as a broken app, so say what happened.
    return (
      <p className={cn("px-4 py-6 text-xs text-muted-foreground", collapsed && "hidden")}>
        No sections available for your account.
      </p>
    );
  }

  return (
    <nav
      className={cn("flex flex-col gap-1 py-4", collapsed ? "px-2" : "px-3")}
      aria-label="Main navigation"
    >
      {items.map((item) =>
        item.children && item.children.length > 0 ? (
          <NavGroup
            key={item.title}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ) : (
          <NavLink
            key={item.title}
            item={item}
            active={!!item.href && isHrefActive(pathname, item.href)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ),
      )}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Leaf link                                                           */
/* ------------------------------------------------------------------ */

interface NavLinkProps {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  depth?: number;
  onNavigate?: () => void;
}

function NavLink({
  item,
  active,
  collapsed,
  depth = 0,
  onNavigate,
}: NavLinkProps) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href ?? "#"}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/30",
        // A 44px target either way — the icon-only rail must not be harder to hit.
        collapsed ? "h-11 w-11 justify-center px-0" : "px-3 py-2.5",
        active
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
      )}
    >
      <Icon
        className={cn("size-[18px] shrink-0", active ? "opacity-100" : "opacity-80")}
        strokeWidth={active ? 2.3 : 2}
      />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
      {!collapsed && depth > 0 && active ? (
        <span className="absolute inset-y-2 -left-[13px] w-0.5 rounded-full bg-sidebar-primary" />
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.title}</TooltipContent>
    </Tooltip>
  );
}

/* ------------------------------------------------------------------ */
/* Collapsible parent                                                  */
/* ------------------------------------------------------------------ */

interface NavGroupProps {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavGroup({ item, pathname, collapsed, onNavigate }: NavGroupProps) {
  const openGroups = useSidebarStore((s) => s.openGroups);
  const setGroupOpen = useSidebarStore((s) => s.setGroupOpen);
  const expandWithGroup = useSidebarStore((s) => s.expandWithGroup);

  const groupActive = isNavItemActive(pathname, item);
  const open = openGroups.includes(item.title);
  const Icon = item.icon;
  const children = item.children ?? [];

  // Auto-expand the group that owns the current route.
  React.useEffect(() => {
    if (groupActive) setGroupOpen(item.title, true);
  }, [groupActive, item.title, setGroupOpen]);

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/*
            A button, not a link to the first child. Clicking a collapsed group
            used to navigate somewhere the user had not chosen; now it opens the
            rail with that group expanded, which is what the click was asking for.
          */}
          <button
            type="button"
            onClick={() => expandWithGroup(item.title)}
            aria-label={`Expand sidebar and open ${item.title}`}
            aria-expanded={false}
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-lg text-sm font-medium transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-ring/30",
              groupActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="size-[18px]" strokeWidth={groupActive ? 2.3 : 2} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <span className="font-semibold">{item.title}</span>
          <ul className="mt-1 space-y-0.5 text-[11px] font-normal opacity-90">
            {children.map((child) => (
              <li key={child.title}>{child.title}</li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={(next) => setGroupOpen(item.title, next)}
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/30",
          groupActive && !open
            ? "bg-sidebar-accent text-sidebar-accent-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        <Icon className="size-[18px] shrink-0 opacity-80" strokeWidth={2} />
        <span className="flex-1 truncate text-left">{item.title}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
        <ul className="ml-[26px] mt-1 flex flex-col gap-1 border-l border-sidebar-border pl-3">
          {children.map((child) => (
            <li key={child.title}>
              <NavLink
                item={child}
                active={!!child.href && isHrefActive(pathname, child.href)}
                collapsed={false}
                depth={1}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
