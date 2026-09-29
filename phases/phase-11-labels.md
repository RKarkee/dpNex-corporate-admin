# Phase 11 — Consignment Request Labels

**Status:** code complete — `typecheck` and `lint` green; `npm run build` must run on the Mac (the Linux workspace cannot load the macOS SWC binary). Awaiting your verification.

Shipping labels on the **consignment request detail page** (Overview tab): generate the first one, regenerate a new version, download the current one, and view or download any version from the history. A port of the staff console's request labels (`depNext-cms/app/(protected)/consignments-request/[id]/components/tabs/overview/labels`) — same contract, `/corporate/…` instead of `/admin/…`.

## Structure

```
src/app/(protected)/consignments/request/
├── types.ts                         + LabelOption, LabelHistoryItem, RegenerateLabelPayload;
│                                      detail gains is_label_generated, current_label, label_options
├── services/consignment-request.service.ts   + label paths in ENDPOINTS
├── services/labels.service.ts       the 5 calls, blob error parsing, labelPayloadFor, produceLabel
├── _hooks/query-keys.ts             + labels / labelOptions / labelHistory under request(id)
├── _hooks/use-labels.ts             options + history queries, useLabelState, produce + file mutations
├── _lib/download-file.ts            downloadBlob, openPendingTab/showBlobInTab, safeFileName, formatFileSize
└── [id]/(detail)/_components/
    ├── overview/label-options-section.tsx   "Labels" card, directly under the action bar
    ├── overview/label-option-row.tsx        one option: Internal / Carrier badge + its button
    └── overview/label-history-section.tsx   "Label history" card, directly under Labels
```

## Endpoints

```
GET  /corporate/consignmentrequests/{id}/label/options     → { label_options: [...] }
GET  /corporate/consignmentrequests/{id}/label             → PDF (first label)
POST /corporate/consignmentrequests/{id}/label/regenerate  → PDF (or JSON ack); body
                                                             { label_type, label_api_id?, regenerate }
GET  /corporate/consignmentrequests/{id}/label/history     → { labels: [...] }
GET  /labels/{label_id}/download                           → PDF (one version)
```

## Decisions

**Options come straight from the API.** One row per entry in `label/options`: INTERNAL always, INTEGRATOR_API (a "Carrier" row, sending its `label_api_id`) only when the API returns one. Nothing is added on this side, so an internal-only request shows only Internal.

**Its own card, near the top.** Labels and Label history sit directly under the action bar rather than as buttons in it and a card at the bottom, where they were hard to find.

**Generated = the flag *or* the history.** `is_label_generated: true` on the detail, or any generated version in the history, switches rows to Regenerate and shows Download label. The corporate detail response may not carry the flag; the history always tells the truth.

**Which call produces a label.** The first INTERNAL label uses `GET …/label`. A carrier label (which that call cannot ask for) and every regenerate use `POST …/label/regenerate` with `regenerate: false|true` — the same split the staff console uses for consignments. Regenerate is confirmed first. A PDF answer is saved at once; a JSON answer shows its message.

**One invalidation refreshes everything.** Label keys sit under `consignmentRequestKeys.request(id)`, so after a generate/regenerate a single invalidation refetches the history *and* the detail's `is_label_generated` / `current_label`. The CMS needs two.

**File names are built client-side.** The private client returns only the blob, not `Content-Disposition`. Generated files save as `{tracking_id}-label.pdf`; history downloads use the row's `file_name`, falling back to `{tracking_id}-v{version}.pdf`. Using the server's name would need the client to expose headers for blob calls.

**Server error messages survive blob requests.** With `responseType: "blob"` an error body is a Blob, so the client can only offer generic copy. `labels.service.ts` reads the JSON back out and rethrows an `ApiError` with the server's `message`. All label calls are `silent`; the hooks toast failures themselves.

**View opens the tab inside the click.** `window.open` after an `await` is blocked as a popup, so an empty tab is opened first and pointed at the blob when it arrives (closed if the fetch fails).

**No permission gate.** None is published for labels; the API decides, as in the CMS.

**`download-file.ts` is a sibling copy,** matching `billing-accounts/_lib` and the consignment billing tab: each feature owns its helpers.

## Left out

- **Options needing `additional_fields`** — shown disabled; no form yet (a request has no carrier, so none are expected).
- **Cancel label** — consignment-only in the CMS; no request endpoint.
- **Labels on the consignment (admin) detail** — a separate phase.

## The gate

```bash
npm run lint && npm run typecheck && npm run build
```

## Verify by hand

1. A request with no label: the Labels card lists only the options the API returns; **Generate Internal Label** → PDF downloads, the row flips to Regenerate, Download label appears, history shows v1 as Current.
2. **Regenerate Internal Label** → confirm → v2 downloads and becomes Current; v1 stays with its file.
3. A request with a carrier: a second **Carrier** row appears; generating it sends its `label_api_id`.
4. History **View** opens the PDF in a new tab; **Download** saves it.
5. Force a failure (e.g. a request the API refuses) → the toast shows the server's own message, not generic copy.
