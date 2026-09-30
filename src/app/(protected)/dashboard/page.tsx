import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { DashboardView } from "./_components/dashboard-view";
import { QuickActions } from "./_components/quick-actions";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Cargo Management Dashboard"
        description="Welcome to your DpNEx cargo management system"
      />
      <DashboardView />
      <div className="mt-5">
        <QuickActions />
      </div>
    </>
  );
}
