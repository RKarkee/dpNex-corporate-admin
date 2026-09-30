import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { CustomerReportView } from "./_components/customer-report-view";

export const metadata: Metadata = { title: "Customer Report" };

export default function CustomerReportPage() {
  return (
    <>
      <PageHeader
        title="Customer Report"
        description="Customer and lead volumes for a date range, with a classification breakdown and per-customer activity."
      />
      <CustomerReportView />
    </>
  );
}
