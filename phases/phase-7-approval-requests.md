# Phase 7 — Approval Requests

**Status:** code complete — awaiting your verification (`npm run build` has to run on the Mac; see The gate below).

Requests that need someone else's agreement: a credit-limit increase, a discount on a consignment, and updates to the corporate or personal profile. One controller serves `/corporate` and `/external`; this app only ever uses the corporate scope, and the caller's own account is the boundary — taken from the authenticated user, never from the request.

## Structure

Colocation-first, the same slice shape as `consignments/request`:

```
src/app/(protected)/approval-requests/
├── page.tsx                       list (Suspense → view)
├── [id]/page.tsx                  detail + withdraw
├── [id]/_components/              detail, skeleton, not-found
├── permissions.ts                 no "use client" — server pages import it
├── types.ts                       record, filters, the update whitelist
├── schema.ts                      one flat schema + superRefine per type
├── mappers.ts                     form values → API payload
├── lib/approval-params.ts         URL ⇄ filters
├── lib/approval-format.ts         amounts, dates, payload summary
├── services/approval-request.service.ts
├── _hooks/                        query keys, list, detail, create, cancel, permissions
└── _components/                   filters, table, view, dialog, fields/
```

Shared code touched: `shared/components/ui/filter-bar.tsx` (new — `FilterField`, `FilterGroup`), `shared/api/services/lookup.service.ts` (corporates / customers / consignments `get-lists`, plus `id`-vs-`value` normalisation), `shared/hooks/use-meta-options.ts` (`approval_statuses`, `approval_request_types`), `shared/config/nav-constant.ts` (the nav entry).

## Endpoints

```
GET  /corporate/approval-requests            page, per_page, q, status, type,
                                             corporate_id, customer_id,
                                             requested_from/to, reviewed_from/to
POST /corporate/approval-requests            type, subject_id?, reason?, payload
GET  /corporate/approval-requests/{id}
POST /corporate/approval-requests/{id}/cancel
```

Both list and detail answer under the **plural** key — `data.approvalrequests` — the detail route holding a single object there. The readers accept the neighbouring shapes too, so an envelope change renders an empty table rather than throwing.

## Decisions

**The URL is the filter state.** Unlike the other lists in this app, which keep page and search in component state. "Look at REQ-2026-000003" is a normal sentence and a filtered queue is worth sending someone, so filters and page live in the query string and the view is restored from it.

**All nine parameters get a control.** `corporate_id`, `customer_id` and the two `reviewed_*` bounds are documented as review-queue parameters and are ignored by the self-scoped portal list. They are in the bar anyway — the same bar serves the review queue when that is built, and the API dropping them is harmless. Both are labelled "Review queue only".

**PENDING is the default view**, matching `/meta`'s `approval_statuses.default` and the API's own behaviour when `status` is omitted. Because absence of `status` means PENDING, "any status" needs its own URL value — `status=ANY` — or "show me everything" would not survive being shared.

**Meta enums are native selects; id lookups are async comboboxes.** Four fixed options do not need a search box. Corporates, customers and consignments run long and page as you scroll. `useLookupLabel` resolves the id in a restored URL back to a name, so a shared link does not show a bare `7`.

**`subject_id` is only sent for `DISCOUNT`.** For the other three the subject is resolved from the authenticated user; the API allows sending it but requires a match, so omitting it is strictly safer than passing a guess.

**Update payloads carry only what changed.** Every whitelisted attribute is optional and only the filled ones are submitted. The schema refuses an empty payload — a request to change nothing can only be rejected.

**Percentage and fixed discounts are validated apart.** A percentage over 100 is caught in the form, because "1500" typed into a percentage field is a cheap slip with an expensive-looking outcome.

**Permissions are per request type, not per action.** `request_credit_limit`, `request_discounts`, `request_corporate_setting_update`, `request_profile_update` — there is no separate view or cancel grant, because a request is the caller's own record on a self-scoped endpoint. So holding one of the four opens the list, the type picker offers only the types the user may raise, and the withdraw button appears only on rows of a type they hold.

**Withdrawal never mutates optimistically.** The record survives as CANCELLED and keeps its place in the list; the server decides whether the withdrawal was still allowed, and its refusal message is shown as-is.

## Left out

- **The admin review queue** — approve / reject with remarks. The filter bar and the service already take its parameters; it needs its own routes and permissions.
- **Prefilling the update forms** from the current corporate / profile record, so the dialog can show before → after rather than only the proposed value.
- **`PROFILE_UPDATE`'s field list** is narrowed by hand to the person-shaped attributes; the API validates both update types against the same whitelist.

## The gate

```bash
npm run lint && npm run typecheck && npm run build
```

`lint` and `typecheck` are green. `build` must be run on the Mac: it downloads a platform-specific SWC binary on first run, which the sandboxed shell has no network to fetch.
