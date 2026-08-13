import type { Metadata } from "next";
import { FileText } from "lucide-react";

import { TabPlaceholder } from "../_components/tab-placeholder";

export const metadata: Metadata = {
  title: "Documents",
};

/**
 * The Documents tab.
 *
 * A landing page for now. The route, the tab and the empty state are real; the
 * data is not. `GET /corporate/consignmentrequests/{id}/documents` is the
 * endpoint this will read once its response shape is confirmed — nothing in the
 * app has called it yet, so the columns would be guesswork.
 */
export default function ConsignmentRequestDocumentsPage() {
  return (
    <TabPlaceholder
      icon={FileText}
      title="Documents are not connected yet"
      description="Invoices, customs paperwork and proof of delivery for this request will appear here."
    />
  );
}
