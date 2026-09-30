import type { Metadata } from "next";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { ReportView } from "./_components/report-view";
import { CONSIGNMENT_REPORT_PERMISSIONS } from "./permissions";

export const metadata: Metadata = { title: "Consignment Report" };

export default function ConsignmentReportPage() {
  return (
    <RequirePermission anyOf={CONSIGNMENT_REPORT_PERMISSIONS}>
      <PageHeader
        title="Consignment Report"
        description="Consignment volumes, weight, and value for a date range, grouped by dimension."
      />
      <ReportView />
    </RequirePermission>
  );
}
