import type { Metadata } from "next";

import { RequirePermission } from "@/shared/auth/require-permission";
import { PageHeader } from "@/shared/components/page-header";

import { RequestReportView } from "./_components/request-report-view";
import { REQUEST_REPORT_PERMISSIONS } from "./permissions";

export const metadata: Metadata = { title: "Consignment Request Report" };

export default function RequestReportPage() {
  return (
    <RequirePermission anyOf={REQUEST_REPORT_PERMISSIONS}>
      <PageHeader
        title="Consignment Request Report"
        description="Request volumes and outcomes for a date range, with breakdowns by status and customer."
      />
      <RequestReportView />
    </RequirePermission>
  );
}
