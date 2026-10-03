"use client";

import * as React from "react";
import { AlertCircle, Download, Loader2, Upload } from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";

import {
  useDownloadBulkUploadTemplate,
  useUploadBulkConsignmentRequests,
} from "../../_hooks/use-bulk-upload";
import type { BulkUploadResult } from "../../services/bulk-upload.service";
import { FileDropzone, validateBulkFile } from "./file-dropzone";

/** The reason a failed upload gives: `errors.file` on a 422, else the message. */
function uploadErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const fileErrors = error.fieldErrors?.file;
    if (fileErrors?.length) return fileErrors.join("\n");
    const first = Object.values(error.fieldErrors ?? {}).flat()[0];
    if (first) return first;
    return error.message;
  }
  return "The upload failed. Please try again.";
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-3">
        <p className="pt-0.5 text-sm font-medium text-foreground">{title}</p>
        {children}
      </div>
    </div>
  );
}

interface UploadCardProps {
  /** Called after a successful upload with what the API returned. */
  onUploaded: (result: BulkUploadResult) => void;
}

/** Template → choose file → upload, as three numbered steps. Rendered inside the upload dialog, which supplies the title. */
export function UploadCard({ onUploaded }: UploadCardProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState(0);
  const upload = useUploadBulkConsignmentRequests();
  const template = useDownloadBulkUploadTemplate();

  const chooseFile = (next: File | null) => {
    setFile(next);
    setProgress(0);
    setError(next ? validateBulkFile(next) : null);
  };

  const submit = async () => {
    if (!file) return;
    const invalid = validateBulkFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    setError(null);
    setProgress(0);
    try {
      const result = await upload.mutateAsync({ file, onProgress: setProgress });
      setFile(null);
      setProgress(0);
      onUploaded(result);
    } catch (uploadError) {
      setError(uploadErrorMessage(uploadError));
    }
  };

  const uploading = upload.isPending;

  return (
        <div className="space-y-6">
          <Step n={1} title="Download the template and fill it in">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => template.mutate()}
              disabled={template.isPending}
            >
              {template.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download template
            </Button>
          </Step>

          <Step n={2} title="Choose your completed file">
            <FileDropzone file={file} onFileChange={chooseFile} disabled={uploading} />
            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p className="whitespace-pre-line break-words">{error}</p>
              </div>
            ) : null}
          </Step>

          <Step n={3} title="Upload">
            {uploading ? (
              <div className="space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {progress < 100 ? `Uploading… ${progress}%` : "Processing the file…"}
                </p>
              </div>
            ) : null}
            <Button type="button" onClick={submit} disabled={!file || Boolean(error) || uploading}>
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {uploading ? "Uploading…" : "Upload file"}
            </Button>
          </Step>
        </div>
  );
}
