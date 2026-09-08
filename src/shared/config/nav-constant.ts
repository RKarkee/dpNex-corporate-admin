import {
  FileText,
  Landmark,
  LayoutDashboard,
  Package,
  Shield,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href?: string;
  icon: LucideIcon;
  children?: NavItem[];
  /**
   * A permission name exactly as `/me` returns it — `view_user`, not
   * `users.view`. Names are globally unique, so no group prefix is needed.
   * Omit to show the item to every signed-in user.
   */
  permission?: string;
  /** Visible if the user holds *any* of these. Use for a section that several
   *  permissions can open. Ignored when `permission` is set. */
  anyPermission?: string[];
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
    // `corporate_view_any_user` is the list-scope grant; `view_user` covers a
    // user who may only open their own record. Either should reveal the link.
    anyPermission: ["corporate_view_any_user", "view_user"],
  },
  {
    title: "Roles",
    href: "/roles",
    icon: ShieldCheck,
    // `corporate_view_any_role` is the list grant; `view_role` covers opening
    // a single role. Either should reveal the section.
    anyPermission: ["corporate_view_any_role", "view_role"],
  },
  {
    title: "Consignments",
    icon: Package,
    children: [
      {
        title: "Consignment Request",
        href: "/consignments/request",
        icon: FileText,
        anyPermission: ["view_consignment", "create_consignment"],
      },
      {
        title: "Consignment Admin",
        href: "/consignments/admin",
        icon: Shield,
        anyPermission: ["approve_consignment", "view_any_consignment"],
      },
    ],
  },
  {
    title: "Billing Accounts",
    href: "/billing-accounts",
    icon: Landmark,
    // Permission names are unconfirmed for this CRM-admin resource — see
    // `billing-accounts/permissions.ts` for why several are listed together.
    // anyPermission: [
    //   "view_billing_account",
    //   "view_any_billing_account",
    //   "view_customer_billing_account",
    //   "crm_view_billing_account",
    // ],
  },
  {
    title:"Profile",
    href:"/profile",
    icon:Users,
    // anyPermission:["view_profile","create_profile"]
  }
];
