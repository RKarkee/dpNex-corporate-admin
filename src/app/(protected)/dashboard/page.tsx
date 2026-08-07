import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { QuickActions } from "./_components/quick-actions";
import { StatCard } from "./_components/stat-card";

export const metadata: Metadata = {
  title: "Dashboard",
};

const stats = [
  {
    label: "Active Shipments",
    value: 24,
    hint: "Currently in transit",
    tone: "navy" as const,
  },
  {
    label: "Pending Orders",
    value: 12,
    hint: "Awaiting processing",
    tone: "crimson" as const,
  },
  {
    label: "Delivered Today",
    value: 8,
    hint: "Successfully completed",
    tone: "orange" as const,
  },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Cargo Management Dashboard"
        description="Welcome to your DpNEx cargo management system"
      />

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="mt-5">
        <QuickActions />
      </div>
    </>
  );
}
