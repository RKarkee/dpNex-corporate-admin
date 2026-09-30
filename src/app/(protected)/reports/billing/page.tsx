import type { Metadata } from "next";

import { PageHeader } from "@/shared/components/page-header";

import { BillingReportView } from "./_components/billing-report-view";

export const metadata: Metadata = { title: "Billing Report" };

export default function BillingReportPage() {
  return (
    <>
      <PageHeader
        title="Billing Report"
        description="Invoicing, collections, and adjustments for a date range."
      />
      <BillingReportView />
    </>
  );
}
