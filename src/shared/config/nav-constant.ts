import {
  BarChart3,
  Bell,
  ClipboardCheck,
  Contact,
  FileBarChart2,
  FileText,
  Landmark,
  Layers,
  LifeBuoy,
  LayoutDashboard,
  ListChecks,
  Package,
  PiggyBank,
  Receipt,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Truck,
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
    title: "Pickup Requests",
    href: "/pickup-requests",
    icon: Truck,
    // No permission gate: booking a collection is open to every signed-in user
    // of the corporate, and the API scopes the list to their own requests.
  },
  {
    title: "Reports",
    icon: BarChart3,
    children: [
      {
        title: "Consignment",
        href: "/reports/consignments",
        icon: FileBarChart2,
        // Same view grants as the Consignment Admin section — this report
        // surfaces the same organisation-wide consignment figures.
        anyPermission: ["view_any_consignment", "approve_consignment", "view_consignment"],
      },
      {
        title: "Customer",
        href: "/reports/customers",
        icon: Contact,
        // No permission gate: no `view_customer`-style grant is published
        // for this resource yet — see `reports/customers/permissions.ts`.
      },
      {
        title: "Requests",
        href: "/reports/requests",
        icon: ListChecks,
        // Same view grants as the Consignment Request / Admin sections —
        // this report covers the same pending/approved/rejected figures.
        anyPermission: ["view_any_consignment", "approve_consignment", "view_consignment", "create_consignment"],
      },
      {
        title: "Billing",
        href: "/reports/billing",
        icon: Receipt,
        // No permission gate: no confirmed `view_billing`-style grant is
        // published for this resource yet — see
        // `reports/billing/permissions.ts` (same gap as Billing Accounts).
      },
      {
        title: "Outstanding",
        href: "/reports/outstanding",
        icon: PiggyBank,
        // No permission gate: same unconfirmed billing-grant gap as the
        // Billing report — see `reports/outstanding/permissions.ts`.
      },
      {
        title: "Summary",
        href: "/reports/summary",
        icon: Layers,
        // Same view grants as the Consignment report — this endpoint mixes
        // consignment and billing figures with no resource-specific grant.
        anyPermission: ["view_any_consignment", "approve_consignment", "view_consignment"],
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
    title: "Approval Requests",
    href: "/approval-requests",
    icon: ClipboardCheck,
    // Approvals are granted per request type — see
    // `approval-requests/permissions.ts`. Holding any one of these is enough
    // to have a list worth opening.
    anyPermission: [
      "request_credit_limit",
      "request_discounts",
      "request_corporate_setting_update",
    ],
  },
  {
    title: "Notifications",
    icon: Bell,
    children: [
      {
        title: "Inbox",
        href: "/notifications",
        icon: Bell,
      },
      {
        title: "Settings",
        href: "/notifications/settings",
        icon: SlidersHorizontal,
      },
    ],
  },
  {
    title: "Support Tickets",
    href: "/support-tickets",
    icon: LifeBuoy,
    // No permission gate: support is open to every signed-in user of the
    // corporate, and the API scopes the list to their own tickets anyway.
  },
  {
    title:"Profile",
    href:"/profile",
    icon:Users,
    // anyPermission:["view_profile","create_profile"]
  }
];
