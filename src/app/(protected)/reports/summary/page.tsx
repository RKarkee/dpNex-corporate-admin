import type { Metadata } from "next";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { SummaryReportView } from "./_components/summary-report-view";
import { SUMMARY_REPORT_PERMISSIONS } from "./permissions";

export const metadata: Metadata = { title: "Summary Report" };

export default function SummaryReportPage() {
  return (
    <RequirePermission anyOf={SUMMARY_REPORT_PERMISSIONS}>
      <PageHeader
        title="Summary Report"
        description="Consignment, billing, and settlement figures for a date range, grouped by dimension."
      />
      <SummaryReportView />
    </RequirePermission>
  );
}
