import type { Metadata } from "next";

import { DocumentsTab } from "./_components/documents-tab";

export const metadata: Metadata = {
  title: "Documents",
};

/**
 * The Documents tab.
 *
 * A server component that does nothing but read the route param and hand it
 * down: the tab itself is interactive (drafts, dialogs, paging) and owns its
 * own data through React Query, so there is nothing useful to fetch here.
 *
 * `params` is a promise in Next 15+, awaited the same way the detail layout
 * does it.
 */
export default async function ConsignmentRequestDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <DocumentsTab requestId={id} />;
}
