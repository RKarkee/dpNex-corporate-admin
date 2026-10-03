"use client";

import type { BulkUploadResult } from "../../services/bulk-upload.service";
import { LookupCard } from "./lookup-card";
import { UploadCard } from "./upload-card";

interface BulkUploadTabProps {
  onUploaded: (result: BulkUploadResult) => void;
  /** Batch to show in the lookup — the last upload, or ?batch= in the URL. */
  batchCode?: string | null;
  /** The lookup was cleared — drop the batch from the URL. */
  onClearBatch?: () => void;
}

/** The Bulk Upload tab: upload on top, batch lookup underneath. */
export function BulkUploadTab({ onUploaded, batchCode, onClearBatch }: BulkUploadTabProps) {
  return (
    <div className="space-y-6">
      <UploadCard onUploaded={onUploaded} />
      <LookupCard initialBatchCode={batchCode} onClear={onClearBatch} />
    </div>
  );
}
