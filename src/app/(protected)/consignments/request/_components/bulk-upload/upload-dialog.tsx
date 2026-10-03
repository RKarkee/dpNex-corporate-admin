"use client";

import { useIsMutating } from "@tanstack/react-query";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";

import { BULK_UPLOAD_MUTATION_KEY } from "../../_hooks/use-bulk-upload";
import type { BulkUploadResult } from "../../services/bulk-upload.service";
import { UploadCard } from "./upload-card";

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** After a successful upload; the dialog closes itself first. */
  onUploaded: (result: BulkUploadResult) => void;
}

/**
 * The upload, in a dialog: template download, the file drop area, and the
 * upload itself with its progress bar.
 *
 * It refuses to close while a file is uploading — dismissing it mid-upload
 * would leave the request running with nothing on screen to show for it.
 * `useIsMutating` on the upload's mutation key answers "is one running?"
 * without the card having to report its state upward.
 */
export function UploadDialog({ open, onOpenChange, onUploaded }: UploadDialogProps) {
  const uploading = useIsMutating({ mutationKey: BULK_UPLOAD_MUTATION_KEY }) > 0;

  return (
    <Dialog open={open} onOpenChange={(next) => (!next && uploading ? undefined : onOpenChange(next))}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload consignment requests</DialogTitle>
          <DialogDescription>Create many consignment requests at once from a spreadsheet.</DialogDescription>
        </DialogHeader>
        <UploadCard
          onUploaded={(result) => {
            onOpenChange(false);
            onUploaded(result);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
