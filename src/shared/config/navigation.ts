import {
  FileText,
  LayoutDashboard,
  Package,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/shared/types";

/**
 * Single source of truth for sidebar navigation.
 * Add an entry here and it appears in the desktop sidebar and the mobile drawer.
 */
export type NavItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  roles?: Role[]; // for future role-based access
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
  },
  {
    title: "Consignments",
    icon: Package,
    children: [
      {
        title: "Consignment Request",
        href: "/consignments/request",
        icon: FileText,
      },
      {
        title: "Consignment Admin",
        href: "/consignments/admin",
        icon: Shield,
      },
    ],
  },
];

/**
 * Filter the nav tree by role. An item with no `roles` is visible to everyone.
 * A parent whose children are all filtered out is removed as well.
 */
export function filterNavByRole(
  items: NavItem[],
  role: Role | undefined,
): NavItem[] {
  return items.reduce<NavItem[]>((acc, item) => {
    const allowed = !item.roles || (role !== undefined && item.roles.includes(role));
    if (!allowed) return acc;

    if (item.children && item.children.length > 0) {
      const children = filterNavByRole(item.children, role);
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
