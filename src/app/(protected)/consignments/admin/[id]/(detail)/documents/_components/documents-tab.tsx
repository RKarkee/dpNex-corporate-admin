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
  Trash2,
  TriangleAlert,
  Upload,
  UploadCloud,
  X,
} from "lucide-react";

import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Pagination } from "@/shared/components/ui/pagination";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { useFileUrl } from "@/shared/hooks/use-file-url";
import { cn } from "@/shared/lib/utils";

import {
  useConsignmentDocuments,
  useSaveConsignmentDocument,
} from "../_hooks/use-consignment-documents";
import {
  documentRequiresFrontBack,
  documentStatusLabel,
  documentTypeLabel,
  type ConsignmentDocument,
  type DocumentStatus,
} from "../types";
import { DocumentEditDialog, DocumentViewDialog } from "./document-dialog";
import { DocumentForm, type DocumentFormValues } from "./document-form";
import { DocumentStatusBadge } from "./document-status-badge";
import {
  documentErrorsFromResponse,
  validateDocumentValues,
  withoutField,
} from "./document-validation";

/**
 * The Documents tab on a consignment request: a paginated list of saved
 * documents plus a staging area for new ones.
 *
 * Drafts live in local state rather than a form library — each carries `File`
 * objects and the list is dynamic, which a resolver would only complicate.
 *
 * A standalone sibling of the profile tab's KYC list, not a reuse of it. The
 * one structural difference is pagination: this collection is paged, so the
 * grid has a footer and a `page` of its own.
 */

const PER_PAGE = 10;

let draftSequence = 0;

interface Draft {
  localId: string;
  values: DocumentFormValues;
  file: File | null;
  frontFile: File | null;
  backFile: File | null;
  errors: Record<string, string>;
}

function newDraft(): Draft {
  draftSequence += 1;
  return {
    localId: `doc-draft-${draftSequence}`,
    values: {
      document_type: "CITIZENSHIP",
      document_number: "",
      notes: "",
    },
    file: null,
    frontFile: null,
    backFile: null,
    errors: {},
  };
}

export function DocumentsTab({ consignmentId }: { consignmentId: string }) {
  const [page, setPage] = React.useState(1);
  const [drafts, setDrafts] = React.useState<Draft[]>([]);
  const [viewing, setViewing] = React.useState<ConsignmentDocument | null>(null);
  const [editing, setEditing] = React.useState<ConsignmentDocument | null>(null);

  const query = useConsignmentDocuments(consignmentId, page, PER_PAGE);
  const saveDocument = useSaveConsignmentDocument(consignmentId);

  const documents = React.useMemo(() => query.data?.items ?? [], [query.data]);
  const meta = query.data?.meta;

  const draftsRef = React.useRef<HTMLDivElement>(null);

  function addDraft() {
    setDrafts((current) => [...current, newDraft()]);

    // The staging area is appended below the grid, so on a full page the new
    // form would open off-screen. Deferred a frame: the section does not exist
    // in the DOM until React has committed the draft.
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

    const problems = validateDocumentValues(draft.values, selection);
    patchDraft(draft.localId, { errors: problems });
    if (Object.keys(problems).length) return false;

    try {
      await saveDocument.mutateAsync({
        input: {
          document_type: draft.values.document_type,
          document_number: draft.values.document_number,
          notes: draft.values.notes || undefined,
        },
        selection,
      });

      // Only the row that succeeded leaves the staging area; a failed one keeps
      // its values so the user can correct and retry.
      discardDraft(draft.localId);
      return true;
    } catch (error) {
      // A rejected scan is reported under the file input it was picked in.
      patchDraft(draft.localId, {
        errors: documentErrorsFromResponse(error, draft.values.document_type),
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

  if (query.isLoading) return <DocumentsTabSkeleton />;

  if (query.isError) {
    return (
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-6" strokeWidth={2} aria-hidden />
        </span>
        <h3 className="mt-4 text-base font-semibold text-foreground">
          Could not load documents
        </h3>
        {/* `ApiError.message` is already sanitised; a raw upstream body would
            leak stack traces at 5xx. */}
        <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
          {isApiError(query.error)
            ? query.error.message
            : "Something went wrong. Please try again."}
        </p>
        <Button
          variant="outline"
          className="mt-6"
          onClick={() => void query.refetch()}
        >
          Try again
        </Button>
      </Card>
    );
  }

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
          <h3 className="font-semibold text-foreground">Documents</h3>
          <p className="text-sm text-muted-foreground">
            Upload and manage the paperwork for this consignment request
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
                        <span className="sr-only">
                          Remove document {index + 1}
                        </span>
                      </Button>
                    </div>

                    <div className="p-4">
                      <DocumentForm
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
                            // last save said about this slot.
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
          <FileText
            className="mb-3 size-10 text-muted-foreground/50"
            aria-hidden
          />
          <p className="font-medium text-muted-foreground">
            No documents uploaded
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Invoices, customs paperwork and proof of delivery appear here.
          </p>
          <Button variant="outline" onClick={addDraft} className="mt-4">
            <Upload className="size-4" aria-hidden />
            Add Document
          </Button>
        </Card>
      ) : documents.length > 0 ? (
        <>
          <div
            className={cn(
              "grid grid-cols-1 gap-4 md:grid-cols-2",
              // Dimmed rather than replaced while the next page loads, so the
              // grid does not collapse and rebuild under the user.
              query.isFetching && "opacity-60 transition-opacity",
            )}
          >
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
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <Pagination
            meta={meta}
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        </>
      ) : null}

      <DocumentViewDialog
        consignmentId={consignmentId}
        document={viewing}
        open={Boolean(viewing)}
        onOpenChange={(open) => !open && setViewing(null)}
      />

      <DocumentEditDialog
        consignmentId={consignmentId}
        document={editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />

    </motion.div>
  );
}

export function DocumentsTabSkeleton() {
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

function countByStatus(
  documents: ConsignmentDocument[],
): Record<DocumentStatus, number> {
  const counts = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
    RE_PROCESS: 0,
    EXPIRED: 0,
  } satisfies Record<DocumentStatus, number>;

  for (const doc of documents) counts[doc.status] += 1;
  return counts;
}

/* -------------------------------------------------------------------------- */
/* Status summary                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The four the summary reports. A zero is information here ("nothing
 * rejected"), which a filtered row could not convey.
 *
 * These count the *current page*, not the whole collection — the paginated
 * endpoint returns no per-status totals, and inventing one from a single page
 * would be a claim the data does not support.
 */
const SUMMARY_STATUSES = [
  "APPROVED",
  "PENDING",
  "REJECTED",
  "EXPIRED",
] as const satisfies readonly DocumentStatus[];

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
        <p className="truncate text-xs font-medium">
          {documentStatusLabel(status)}
        </p>
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
}: {
  document: ConsignmentDocument;
  onView: () => void;
  onEdit: () => void;
}) {
  const twoSided = documentRequiresFrontBack(doc.document_type);

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

      <div className="space-y-2">
        <DocumentStatusBadge status={doc.status} className="self-start" />

        {/* Notes replaced the old reviewer banner, so it is styled as ordinary
            card copy rather than an amber alert — it is the user's own text, not
            a warning about the document. Clamped so a long note cannot stretch
            one card taller than its neighbours in the grid. */}
        {doc.notes ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {doc.notes}
          </p>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * One stored scan on a card. Purely a display tile — not interactive.
 *
 * Enlarging a scan and acting on it both belong to the dialogs the View and
 * Edit buttons open, so nothing on the card is a click target.
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
