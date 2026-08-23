import type { Metadata } from "next";

import { DocumentsTab } from "./_components/documents-tab";

export const metadata: Metadata = {
  title: "Documents",
};

/**
 * The Documents tab.
 *
 * A server component that does nothing but read the route param and hand it
 * down: the tab is interactive (drafts, dialogs, paging) and owns its own data
 * through React Query, so there is nothing useful to fetch here.
 */
export default async function ConsignmentDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DocumentsTab consignmentId={id} />;
}
