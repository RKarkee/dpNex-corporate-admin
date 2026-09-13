# Phase 9 — Pickup Requests

**Status:** code complete — awaiting your verification (`npm run lint && npm run typecheck && npm run build` has to run on the Mac; the sandboxed workspace was down while this was written).

A van booked to collect consignment requests that are already waiting. Scope is the API's: internal staff with `manage_pickup_requests` see every request, a corporate caller sees only their own.

## Structure

Colocation-first, the same slice shape as `approval-requests` and `support-tickets`:

```
src/app/(protected)/pickup-requests/
├── page.tsx                      list
├── [id]/page.tsx                 detail (read-only)
├── [id]/_components/             detail, skeleton, not-found
├── types.ts · schema.ts · mappers.ts
├── services/pickup-request.service.ts
├── _hooks/                       keys, list, detail, create
└── _components/                  table, view, badges, dialog, consignment picker
```

Shared code touched: `nav-constant.ts` only. Everything else this feature needs — `AsyncCombobox`, `Field`, `Pagination`, `EmptyState`, `formatDate` — was already there.

## Endpoints

```
GET  /corporate/pickuprequests        page, per_page — and nothing else
POST /corporate/pickuprequests        consignment_request_ids[], pickup_date,
                                      pickup_time?, vehicle_type, remarks?
GET  /corporate/pickuprequests/{id}
GET  /consignments/get-lists          the picker
```

Both list and detail answer under the **plural** key — `data.pickuprequests` — the detail route holding a single object there.

## Decisions

**No filter bar.** The endpoint documents `page` and `per_page` and nothing else. Sending a `status` or date range it might silently ignore would look like a broken filter, which is worse than no filter. Page is local state rather than a URL param for the same reason: with nothing to filter by, a query string would carry a page number and nothing else. Both change the day the API publishes filters — the primitives are already shared.

**The consignment picker is a checklist.** Every other lookup in this app holds one value, so picking again overwrites the last choice. Here the field is a *set*, and a picker that quietly swapped 101 for 102 would be the worst possible failure: a van booked for one parcel by someone who believed they had booked it for three.

`AsyncCombobox` gained a `multiple` mode for it — the popover stays open, every row keeps its tick, and `onChange` fires as a toggle — because closing on each pick makes choosing five things five trips through a search box that has forgotten what you typed. The chips below are the same set from the other direction, which is what you read once the list has scrolled past the ticks. Shared rather than local: the next multi-select in this app should not reinvent the paging and debounce logic.

**The three real rules are the server's.** Every consignment request must belong to the same customer or corporate, none may already be collected, and none may sit on another still-open pickup. All three depend on rows this app cannot see; guessing would either block a valid booking or promise one the server refuses. The form validates shape only, and a refusal is rendered verbatim above the picker — `pickupRefusalReason` hoists the `consignment_request_ids.N` message, which is the one that names the offending row. Field-shaped complaints (date, time, vehicle, remarks) still land on their own field.

**`pickup_time` is optional and trimmed to `H:i`.** The API answers with `14:30:00` and accepts `14:30`; a booking with no time is valid and reads as "any time" on the detail page rather than as a missing value.

**Zero is a real answer.** `total_boxes` and `total_weight` come back `0` on a van booked before anything is packed — shown as `0 boxes` rather than an em dash, because "nothing packed yet" and "unknown" are different facts.

**The detail lists the rows, not just the count.** `GET {id}` nests the whole consignment request — tracking id, route, status, pickup note — so the page shows which shipments are on the van rather than how many, each linking to its own page. The list response carries only `consignment_request_count`, so `consignmentCount()` prefers the array and falls back to the number.

**Read-only detail.** No cancel or reschedule endpoint was published, and `next_statuses` comes back empty on every payload seen so far. The page reports assignment and cancellation when the server sets them; it does not drive the workflow.

## Left out

- **Cancelling or rescheduling** from the portal — needs endpoints.
- **Filtering and sorting** — needs query parameters.

## The gate

```bash
npm run lint && npm run typecheck && npm run build
```
