"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Eye,
  FileText,
  Pencil,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFileUrl } from "@/shared/hooks/use-file-url";
import { cn } from "@/shared/lib/utils";

import {
  useDeleteKycDocument,
  useSaveKycDocument,
} from "../_hooks/use-kyc-documents";
import {
  documentTypeLabel,
  kycRequiresFrontBack,
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
 * objects and the list is dynamic, which a resolver would only complicate. The
 * reference app made the same call for the same reason; only the profile form
 * next door uses react-hook-form.
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
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 2 }, (_, index) => (
        <Card key={index} className="space-y-3 p-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
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
  const draftsRef = React.useRef<HTMLDivElement>(null);

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

  function discardDraft(localId: string) {
    setDrafts((current) => current.filter((row) => row.localId !== localId));
  }

  /**
   * Uploads one draft. Returns whether it was accepted, so the batch path can
   * count successes without re-reading state React has not committed yet.
   */
  async function uploadDraft(draft: Draft): Promise<boolean> {
    const selection = {
      file: draft.file,
      front_file: draft.frontFile,
      back_file: draft.backFile,
    };

    const problems = validateKycValues(draft.values, selection);
    patchDraft(draft.localId, { errors: problems });
    if (Object.keys(problems).length) return false;

    try {
      await saveDocument.mutateAsync({
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
      });

      // Only the row that succeeded leaves the staging area; a failed one keeps
      // its values so the user can correct and retry.
      discardDraft(draft.localId);
      return true;
    } catch (error) {
      // A rejected scan is reported under the file input it was picked in,
      // which is where the user has to act. The hook suppresses its toast for
      // exactly the failures this returns something for.
      patchDraft(draft.localId, {
        errors: kycErrorsFromResponse(error, draft.values.document_type),
      });
      return false;
    }
  }

  /**
   * Sequential, not `Promise.all`: several multipart uploads in flight at once
   * is the reliable way to hit a proxy's concurrent-body limit, and a failure
   * part-way through is easier to read when the earlier ones have settled.
   */
  async function uploadAll() {
    for (const draft of drafts) {
      await uploadDraft(draft);
    }
  }

  const counts = countByStatus(documents);
  const busy = saveDocument.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* ── Header ── */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="font-semibold text-foreground">KYC Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload and manage your identity verification documents
          </p>
        </div>
        <Button onClick={addDraft} className="w-full sm:w-auto">
          <Plus className="size-4" aria-hidden />
          Add Document
        </Button>
      </div>

      {/* ── Status summary ── */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUMMARY_STATUSES.map((status) => (
            <StatusTile key={status} status={status} count={counts[status]} />
          ))}
        </div>
      ) : null}

      {/* ── Staged drafts ── */}
      <AnimatePresence initial={false}>
        {drafts.length > 0 ? (
          <motion.div
            ref={draftsRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="scroll-mt-6"
          >
            <Card className="space-y-4 border-primary/30 p-4 sm:p-5">
              <h4 className="flex items-center gap-2 text-base font-semibold text-foreground">
                <UploadCloud className="size-5 text-primary" aria-hidden />
                New Documents to Upload
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {drafts.length}
                </span>
              </h4>

              <AnimatePresence initial={false}>
                {drafts.map((draft, index) => (
                  <motion.div
                    key={draft.localId}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden rounded-xl border border-border"
                  >
                    <div className="flex items-center justify-between border-b border-border bg-secondary/50 px-4 py-3">
                      <span className="text-sm font-medium text-foreground">
                        Document {index + 1}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => discardDraft(draft.localId)}
                        className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        <span className="sr-only">Remove document {index + 1}</span>
                      </Button>
                    </div>

                    <div className="p-4">
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
                            frontFile:
                              slot === "front_file" ? next : draft.frontFile,
                            backFile:
                              slot === "back_file" ? next : draft.backFile,
                            // Picking a different scan answers whatever the
                            // last save said about this slot, so the stale
                            // message goes with it.
                            errors: withoutField(draft.errors, slot),
                          })
                        }
                        idPrefix={draft.localId}
                        disabled={busy}
                        errors={draft.errors}
                      />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <div className="flex flex-col justify-end gap-3 pt-1 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={addDraft}
                >
                  <Plus className="size-4" aria-hidden />
                  Add Another
                </Button>
                <Button
                  type="button"
                  disabled={busy}
                  onClick={() => void uploadAll()}
                  className="min-w-40"
                >
                  <Save className="size-4" aria-hidden />
                  {busy
                    ? "Uploading…"
                    : `Upload ${drafts.length} Document${drafts.length > 1 ? "s" : ""}`}
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Saved documents ── */}
      {documents.length === 0 && drafts.length === 0 ? (
        <Card className="flex flex-col items-center justify-center px-6 py-14 text-center">
          <ShieldCheck className="mb-3 size-10 text-muted-foreground/50" aria-hidden />
          <p className="font-medium text-muted-foreground">
            No KYC documents uploaded
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your documents to complete KYC verification
          </p>
          <Button variant="outline" onClick={addDraft} className="mt-4">
            <Upload className="size-4" aria-hidden />
            Add Document
          </Button>
        </Card>
      ) : documents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
              >
                <DocumentCard
                  document={doc}
                  onView={() => setViewing(doc)}
                  onEdit={() => setEditing(doc)}
                  onDelete={() => setPendingDelete(doc)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
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
    </motion.div>
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

/* -------------------------------------------------------------------------- */
/* Status summary                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The four the summary reports, always shown once any document exists — a zero
 * is information here ("nothing rejected"), which a filtered row cannot convey.
 *
 * `RE_PROCESS` is left out to keep the row at four across a mobile two-column
 * grid; a document in that state still shows its own badge on the card.
 */
const SUMMARY_STATUSES = [
  "APPROVED",
  "PENDING",
  "REJECTED",
  "EXPIRED",
] as const satisfies readonly KycStatus[];

const STATUS_TILE: Record<
  (typeof SUMMARY_STATUSES)[number],
  { icon: React.ElementType; className: string }
> = {
  APPROVED: {
    icon: CheckCircle2,
    className: "border-success-border bg-success-surface text-success",
  },
  PENDING: {
    icon: Clock,
    className: "border-warning-border bg-warning-surface text-warning",
  },
  REJECTED: {
    icon: X,
    className: "border-danger-border bg-danger-surface text-destructive",
  },
  EXPIRED: {
    icon: AlertCircle,
    className: "border-border bg-secondary text-muted-foreground",
  },
};

function StatusTile({
  status,
  count,
}: {
  status: (typeof SUMMARY_STATUSES)[number];
  count: number;
}) {
  const { icon: Icon, className } = STATUS_TILE[status];

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">{kycStatusLabel(status)}</p>
        <p className="text-lg font-bold leading-none">{count}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Document card                                                              */
/* -------------------------------------------------------------------------- */

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
  const twoSided = kycRequiresFrontBack(doc.document_type);

  return (
    <Card className="h-full p-4 transition-shadow hover:shadow-md">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10">
            <FileText className="size-4 text-primary" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {documentTypeLabel(doc.document_type)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              #{doc.document_number}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onView}
            className="size-7 text-muted-foreground hover:text-primary"
          >
            <Eye className="size-3.5" aria-hidden />
            <span className="sr-only">View document</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="size-7 text-muted-foreground hover:text-primary"
          >
            <Pencil className="size-3.5" aria-hidden />
            <span className="sr-only">Edit document</span>
          </Button>
          {/* Not in the reference, which has no delete at all. Kept because the
              corporate API exposes the endpoint and dropping a working action
              to match a layout would be a regression. */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="size-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="size-3.5" aria-hidden />
            <span className="sr-only">Delete document</span>
          </Button>
        </div>
      </div>

      {/* `file_path` is the front side of a two-sided document and the only
          scan of everything else. */}
      {twoSided ? (
        <div className="mb-3 grid grid-cols-2 gap-2">
          <Thumbnail reference={doc.file_path} label="Front" />
          <Thumbnail reference={doc.back_file_path} label="Back" />
        </div>
      ) : doc.file_path ? (
        <div className="mb-3">
          <Thumbnail reference={doc.file_path} label="Document" />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <KycStatusBadge status={doc.status} className="self-start" />

        {doc.remarks ? (
          <p className="mt-1.5 rounded border border-warning-border bg-warning-surface px-2 py-1 text-xs text-foreground">
            {doc.remarks}
          </p>
        ) : null}

        <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
          {doc.issue_date ? (
            <span>Issued: {doc.issue_date.slice(0, 10)}</span>
          ) : null}
          {doc.expiry_date ? (
            <span>Expires: {doc.expiry_date.slice(0, 10)}</span>
          ) : null}
          {doc.issued_by ? <span>By: {doc.issued_by}</span> : null}
          {doc.issued_country ? (
            <span>Country: {doc.issued_country}</span>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

/**
 * One stored scan on a card. Purely a display tile — not interactive.
 *
 * No clear button and no click target: the card reports what is on record, and
 * both acting on a scan and enlarging it belong to the dialogs the View and
 * Edit buttons open.
 */
function Thumbnail({
  reference,
  label,
}: {
  reference?: string | null;
  label: string;
}) {
  const { src, isLoading } = useFileUrl(reference);

  return (
    <div className="relative grid h-40 w-full place-items-center overflow-hidden rounded-xl border border-border bg-secondary/40 shadow-sm">
      {isLoading ? (
        <Skeleton className="size-full" />
      ) : src ? (
        <>
          <img
            src={src}
            alt={`${label} scan`}
            className="size-full object-cover"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-foreground/15 via-transparent to-transparent"
          />
          <span className="absolute bottom-2 left-2 rounded-full bg-foreground/60 px-2 py-0.5 text-[11px] font-medium text-background">
            {label}
          </span>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
          <FileText className="size-8 opacity-50" aria-hidden />
          <span className="text-[11px]">{reference ? label : "Not added"}</span>
        </div>
      )}
    </div>
  );
}
