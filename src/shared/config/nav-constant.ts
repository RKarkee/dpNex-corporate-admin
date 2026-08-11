import { LucideIcon, LayoutDashboard, Users, Package, FileText, Shield } from "lucide-react";



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