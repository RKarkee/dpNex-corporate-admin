"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { toast } from "@/shared/components/toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";

import { useConsignmentPermissions } from "../_hooks/use-consignment-permissions";
import type { BulkUploadResult } from "../services/bulk-upload.service";
import { BulkUploadTab } from "./bulk-upload/bulk-upload-tab";
import { DeletedRequestsView } from "./deleted-requests-view";
import { RequestsView } from "./requests-view";

/**
 * The landing page's tabs — the live list, the deleted one, and Bulk Upload
 * for users who may create requests from a spreadsheet.
 *
 * The open tab lives in `?tab=`, so a refresh or a shared link reopens it; the
 * main list keeps the bare URL. Anything unrecognised — or Bulk Upload without
 * the permission — falls back to it. The batch being looked at on the Bulk
 * Upload tab lives in `?batch=` the same way.
 */

const DELETED = "deleted";
const BULK_UPLOAD = "bulk-upload";

export function RequestsLanding() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { canBulkUpload } = useConsignmentPermissions();

  const requested = searchParams.get("tab");
  const tab =
    requested === DELETED
      ? DELETED
      : requested === BULK_UPLOAD && canBulkUpload
        ? BULK_UPLOAD
        : "all";
  const batchCode = tab === BULK_UPLOAD ? searchParams.get("batch") : null;

  function handleTabChange(next: string, batch?: string) {
    const query = new URLSearchParams(searchParams.toString());
    if (next === DELETED || next === BULK_UPLOAD) query.set("tab", next);
    else query.delete("tab");
    // `?batch=` only means something on the Bulk Upload tab.
    if (next === BULK_UPLOAD && batch) query.set("batch", batch);
    else if (next !== BULK_UPLOAD) query.delete("batch");
    const qs = query.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /** "Clear" on the Bulk Upload lookup — stay on the tab, forget the batch. */
  function clearBatchFromUrl() {
    const query = new URLSearchParams(searchParams.toString());
    if (!query.has("batch")) return;
    query.delete("batch");
    const qs = query.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  /**
   * A successful upload echoes the API's own message, and its batch opens in
   * "Check an upload" underneath — status and rows — so the user can watch it
   * process without retyping the code.
   */
  function handleUploaded(result: BulkUploadResult) {
    toast.success({
      title: result.message,
      message: result.batchCode
        ? `Batch ${result.batchCode} — its status is shown below.`
        : "The new requests will appear in the list once processed.",
      duration: 8000,
    });
    if (result.batchCode) handleTabChange(BULK_UPLOAD, result.batchCode);
  }

  return (
    <Tabs value={tab} onValueChange={handleTabChange}>
      <TabsList>
        <TabsTrigger value="all">Consignment Requests</TabsTrigger>
        <TabsTrigger value={DELETED}>Deleted Consignment Requests</TabsTrigger>
        {canBulkUpload ? <TabsTrigger value={BULK_UPLOAD}>Bulk Upload</TabsTrigger> : null}
      </TabsList>

      <TabsContent value="all">
        <RequestsView />
      </TabsContent>
      <TabsContent value={DELETED}>
        <DeletedRequestsView />
      </TabsContent>
      {canBulkUpload ? (
        <TabsContent value={BULK_UPLOAD}>
          <BulkUploadTab onUploaded={handleUploaded} batchCode={batchCode} onClearBatch={clearBatchFromUrl} />
        </TabsContent>
      ) : null}
    </Tabs>
  );
}
