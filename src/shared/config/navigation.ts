import {
  FileText,
  LayoutDashboard,
  Package,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

import { hasPermission } from "@/shared/auth/permissions";
import type { User } from "@/shared/auth/types";

/**
 * Single source of truth for sidebar navigation.
 * Add an entry here and it appears in the desktop sidebar and the mobile drawer.
 */
export type NavItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  /** `"module.action"`. Omit to show the item to every signed-in user. */
  permission?: string;
};

export const sidebarNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Users",
    href: "/users",
    icon: Users,
    permission: "users.view",
  },
  {
    title: "Consignments",
    icon: Package,
    children: [
      {
        title: "Consignment Request",
        href: "/consignments/request",
        icon: FileText,
        permission: "consignments.view",
      },
      {
        title: "Consignment Admin",
        href: "/consignments/admin",
        icon: Shield,
        permission: "consignments.view",
      },
    ],
  },
];

/** No `permission` means visible to all. Parents with no surviving children are dropped. */
export function filterNavByPermission(
  items: NavItem[],
  user: User | null,
): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    const allowed = !item.permission || hasPermission(user, item.permission);
    if (!allowed) return acc;

    if (item.children && item.children.length > 0) {
      const children = filterNavByPermission(item.children, user);
      if (children.length === 0 && !item.href) return acc;
      acc.push({ ...item, children });
      return acc;
    }

    acc.push(item);
    return acc;
  }, []);
}

/** True when `href` is the current route or an ancestor of it. */
export function isHrefActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** True when any descendant of `item` matches the current route. */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.href && isHrefActive(pathname, item.href)) return true;
  return (item.children ?? []).some((child) => isNavItemActive(pathname, child));
}

/** Breadcrumb-ish title lookup used by the page header. */
export function findNavTitle(
  pathname: string,
  items: NavItem[] = sidebarNav,
): string | undefined {
  for (const item of items) {
    if (item.href && isHrefActive(pathname, item.href)) return item.title;
    if (item.children) {
      const nested = findNavTitle(pathname, item.children);
      if (nested) return nested;
    }
  }
  return undefined;
}
