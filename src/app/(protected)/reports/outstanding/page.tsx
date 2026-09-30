import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { OutstandingReportView } from "./_components/outstanding-report-view";

export const metadata: Metadata = { title: "Outstanding Report" };

export default function OutstandingReportPage() {
  return (
    <>
      <PageHeader
        title="Outstanding Report"
        description="Billed, collected, and outstanding balances for a date range, by account."
      />
      <OutstandingReportView />
    </>
  );
}
