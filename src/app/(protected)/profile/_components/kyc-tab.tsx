"use client";

import * as React from "react";
import { Eye, FileText, Pencil, Plus, ShieldCheck, Trash2, Upload } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { EmptyState } from "@/shared/components/empty-state";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFileUrl } from "@/shared/hooks/use-file-url";

import {
  useDeleteKycDocument,
  useSaveKycDocument,
} from "../_hooks/use-kyc-documents";
import {
  documentTypeLabel,
  kycRequiresFrontBack,
  KYC_STATUSES,
  kycStatusLabel,
  type KycDocument,
  type KycStatus,
} from "../types";
import {
  KycDocumentForm,
  type KycDocumentFormValues,
} from "./kyc-document-form";
import { KycEditDialog, KycViewDialog } from "./kyc-document-dialog";
import { KycStatusBadge } from "./kyc-status-badge";
import {
  kycErrorsFromResponse,
  validateKycValues,
  withoutField,
} from "./kyc-validation";

/**
 * The "KYC Documents" tab: a list of saved documents plus a staging area for
 * new ones.
 *
 * Drafts live in local state rather than a form library — each carries `File`
 * objects and the list is dynamic, which a resolver would only complicate.
 */

let draftSequence = 0;

interface Draft {
  localId: string;
  values: KycDocumentFormValues;
  file: File | null;
  frontFile: File | null;
  backFile: File | null;
  errors: Record<string, string>;
}

function newDraft(): Draft {
  draftSequence += 1;
  return {
    localId: `draft-${draftSequence}`,
    values: {
      document_type: "CITIZENSHIP",
      document_number: "",
      issue_date: "",
      expiry_date: "",
      issued_country: "",
      issued_by: "",
      issued_place: "",
    },
    file: null,
    frontFile: null,
    backFile: null,
    errors: {},
  };
}

export function KycTabSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, index) => (
        <Card key={index} className="space-y-3 p-5">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </Card>
      ))}
    </div>
  );
}

export function KycTab({ documents }: { documents: KycDocument[] }) {
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [viewing, setViewing] = React.useState<KycDocument | null>(null);
  const [editing, setEditing] = React.useState<KycDocument | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<KycDocument | null>(
    null,
  );

  const saveDocument = useSaveKycDocument();
  const deleteDocument = useDeleteKycDocument();

  /**
   * The staging area sits below the saved documents, so on an account with a
   * full grid the new form appears off-screen and "Add Document" looks inert.
   *
   * The scroll is deferred a frame: the section does not exist in the DOM until
   * React has committed the appended draft.
   */
  const draftsRef = React.useRef<HTMLElement>(null);

  function addDraft() {
    setDrafts((current) => [...current, newDraft()]);

    requestAnimationFrame(() => {
      draftsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function patchDraft(localId: string, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft) =>
        draft.localId === localId ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function uploadDraft(draft: Draft) {
    const selection = {
      file: draft.file,
      front_file: draft.frontFile,
      back_file: draft.backFile,
    };

    const problems = validateKycValues(draft.values, selection);
    patchDraft(draft.localId, { errors: problems });
    if (Object.keys(problems).length) return;

    saveDocument.mutate(
      {
        input: {
          document_type: draft.values.document_type,
          document_number: draft.values.document_number,
          issue_date: draft.values.issue_date,
          expiry_date: draft.values.expiry_date || undefined,
          issued_country: draft.values.issued_country,
          issued_by: draft.values.issued_by || undefined,
          issued_place: draft.values.issued_place || undefined,
        },
        selection,
      },
      {
        // Only the row that succeeded leaves the staging area; a failed one
        // keeps its values so the user can correct and retry.
        onSuccess: () =>
          setDrafts((current) =>
            current.filter((row) => row.localId !== draft.localId),
          ),
        // A rejected scan is reported under the file input it was picked in,
        // which is where the user has to act. The hook suppresses its toast for
        // exactly the failures this returns something for.
        onError: (error) =>
          patchDraft(draft.localId, {
            errors: kycErrorsFromResponse(error, draft.values.document_type),
          }),
      },
    );
  }

  const counts = countByStatus(documents);

  return (
    <div className="space-y-6">
      {documents.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {KYC_STATUSES.filter((status) => counts[status] > 0).map((status) => (
            <span
              key={status}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            >
              <span className="font-semibold text-foreground">
                {counts[status]}
              </span>
              <span className="text-muted-foreground">
                {kycStatusLabel(status)}
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
              <ShieldCheck className="size-4 text-primary" aria-hidden />
              Your documents
            </h2>
            <p className="text-sm text-muted-foreground">
              Identity documents DpNEx holds for your account.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={addDraft}
          >
            <Plus className="size-4" aria-hidden />
            Add document
          </Button>
        </div>

        {documents.length === 0 && drafts.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No documents yet"
            description="Upload an identity document so your account can be verified."
            action={
              <Button
                type="button"
                onClick={addDraft}
              >
                <Plus className="size-4" aria-hidden />
                Add document
              </Button>
            }
          />
        ) : null}

        {documents.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                onView={() => setViewing(doc)}
                onEdit={() => setEditing(doc)}
                onDelete={() => setPendingDelete(doc)}
              />
            ))}
          </div>
        ) : null}
      </section>

      {drafts.length > 0 ? (
        <section ref={draftsRef} className="scroll-mt-6 space-y-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Upload className="size-4 text-primary" aria-hidden />
            New documents
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {drafts.length}
            </span>
          </h2>

          {drafts.map((draft) => (
            <Card key={draft.localId} className="space-y-5 p-5">
              <KycDocumentForm
                values={draft.values}
                onChange={(patch) =>
                  patchDraft(draft.localId, {
                    values: { ...draft.values, ...patch },
                  })
                }
                file={draft.file}
                frontFile={draft.frontFile}
                backFile={draft.backFile}
                onFileChange={(slot, next) =>
                  patchDraft(draft.localId, {
                    file: slot === "file" ? next : draft.file,
                    frontFile: slot === "front_file" ? next : draft.frontFile,
                    backFile: slot === "back_file" ? next : draft.backFile,
                    // Picking a different scan answers whatever the last save
                    // said about this slot, so the stale message goes with it.
                    errors: withoutField(draft.errors, slot),
                  })
                }
                disabled={saveDocument.isPending}
                errors={draft.errors}
              />

              <div className="flex flex-wrap justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={saveDocument.isPending}
                  onClick={() =>
                    setDrafts((current) =>
                      current.filter((row) => row.localId !== draft.localId),
                    )
                  }
                >
                  Discard
                </Button>
                <Button
                  type="button"
                  disabled={saveDocument.isPending}
                  onClick={() => uploadDraft(draft)}
                >
                  <Upload className="size-4" aria-hidden />
                  {saveDocument.isPending ? "Uploading…" : "Upload document"}
                </Button>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      <KycViewDialog
        document={viewing}
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      <KycEditDialog
        document={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Delete this document?"
        description={
          pendingDelete
            ? `${documentTypeLabel(pendingDelete.document_type)} · ${pendingDelete.document_number}. This cannot be undone, and the scans are removed with it.`
            : undefined
        }
        confirmLabel="Delete"
        tone="destructive"
        onConfirm={async () => {
          if (!pendingDelete) return;
          await deleteDocument.mutateAsync(pendingDelete.id);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}

function countByStatus(documents: KycDocument[]): Record<KycStatus, number> {
  const counts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    RE_PROCESS: 0,
    EXPIRED: 0,
  } satisfies Record<KycStatus, number>;

  for (const doc of documents) counts[doc.status] += 1;
  return counts;
}

function DocumentCard({
  document: doc,
  onView,
  onEdit,
  onDelete,
}: {
  document: KycDocument;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { src } = useFileUrl(doc.file_path);

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="grid h-40 place-items-center overflow-hidden border-b border-border bg-secondary/40">
        {src ? (
          <img
            src={src}
            alt={`${documentTypeLabel(doc.document_type)} scan`}
            className="size-full object-contain"
          />
        ) : (
          <FileText className="size-8 text-muted-foreground" aria-hidden />
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {documentTypeLabel(doc.document_type)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {doc.document_number}
          </p>
          {kycRequiresFrontBack(doc.document_type) ? (
            <p className="text-xs text-muted-foreground">Front and back</p>
          ) : null}
        </div>

        <KycStatusBadge status={doc.status} className="self-start" />

        <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onView}>
            <Eye className="size-4" aria-hidden />
            View
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden />
            Edit
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-4" aria-hidden />
            <span className="sr-only">
              Delete {documentTypeLabel(doc.document_type)}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
