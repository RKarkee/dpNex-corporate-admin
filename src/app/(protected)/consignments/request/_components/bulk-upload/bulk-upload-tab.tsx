"use client";

import * as React from "react";
import { Upload } from "lucide-react";

import { Button } from "@/shared/components/ui/button";

import type { BulkUploadResult } from "../../services/bulk-upload.service";
import { BatchesSection } from "./batches-section";
import { LookupCard } from "./lookup-card";
import { UploadDialog } from "./upload-dialog";

interface BulkUploadTabProps {
  onUploaded: (result: BulkUploadResult) => void;
  /** Batch to show in the lookup — the last upload, or ?batch= in the URL. */
  batchCode?: string | null;
  /** The lookup was cleared — drop the batch from the URL. */
  onClearBatch?: () => void;
}

/**
 * The Bulk Upload tab: an "Upload file" button (the upload lives in a dialog),
 * the list of every upload, and "Check an upload" underneath — where a batch
 * code copied from the list is pasted to see its status and rows.
 */
export function BulkUploadTab({ onUploaded, batchCode, onClearBatch }: BulkUploadTabProps) {
  const [uploadOpen, setUploadOpen] = React.useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Bulk upload</h2>
          <p className="text-sm text-muted-foreground">
            Create consignment requests from a spreadsheet, then follow each upload below.
          </p>
        </div>
        <Button type="button" onClick={() => setUploadOpen(true)}>
          <Upload className="size-4" />
          Upload file
        </Button>
      </div>

      <BatchesSection />
      <LookupCard initialBatchCode={batchCode} onClear={onClearBatch} />

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} onUploaded={onUploaded} />
    </div>
  );
}
