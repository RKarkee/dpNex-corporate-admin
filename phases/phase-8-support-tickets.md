# Phase 8 — Support Tickets

**Status:** code complete — awaiting your verification (`npm run build` has to run on the Mac; see The gate below).

Questions and problems raised inside the corporate, and what has happened to them. Scope is applied by the API before any filter: a corporate caller sees only their own tickets, so naming another corporate narrows that set rather than reaching outside it.

## Structure

Colocation-first, the same slice shape as `approval-requests`:

```
src/app/(protected)/support-tickets/
├── page.tsx                      list (Suspense → view)
├── [id]/page.tsx                 detail + close
├── [id]/_components/             detail, skeleton, not-found
├── types.ts                      record, enums, the 20 filter keys
├── schema.ts · mappers.ts        raise-a-ticket form → payload
├── lib/ticket-params.ts          URL ⇄ filters, contradiction rules
├── services/support-ticket.service.ts
├── _hooks/                       keys, list, detail, create, close
└── _components/                  filters, lookup-filter, table, view, dialog, badges
```

Shared code touched: `ui/filter-bar.tsx` gained `TriStateSelect` and `YFlagSelect`; `ui/form-field.tsx` is the approval slice's `Field` promoted to shared (three imports updated); `lib/dates.ts` is `formatDate`/`formatDateTime` promoted out of `approval-format.ts`, which re-exports them; `lookup.service.ts` gained `/assignables/get-lists` and `/corporate/users/get-lists`; `use-meta-options.ts` gained the three ticket enums; `nav-constant.ts` gained the entry.

## Endpoints

```
GET  /corporate/supporttickets            page, per_page + the 20 filters below
POST /corporate/supporttickets            subject, description, category, priority,
                                          consignment_id?, customer_id?
GET  /corporate/supporttickets/{id}       the record, with `replies` inline
POST /corporate/supporttickets/{id}/replies   message (is_internal never sent)
POST /corporate/supporttickets/{id}/close
```

Both list and detail answer under the **plural** key — `data.supporttickets` — the detail route holding a single object there.

## Decisions

**Twenty filters, arranged by how often they are asked.** Search, status, priority and category stay on screen; the other sixteen fold into five groups — Identifiers, People, Scope, State, Dates. The count badge on "More filters" is what keeps a hidden filter honest.

**Three quick chips apply on click**: *Awaiting first response*, *Unassigned*, *Open only*. Those are the queues people actually work from, and a queue you have to press Apply to see is a queue you stop using. They act on the applied filters rather than the draft, so a half-typed search term is not swept up with them.

**Contradictory filter pairs resolve as you pick**, in `lib/ticket-params.ts`:

| Picking | Clears |
|---|---|
| an assignee | `unassigned=Y` — and the reverse |
| `open=Y` | `resolved=true`, and a RESOLVED / CLOSED status |
| status RESOLVED or CLOSED | `open=Y` |
| a consignment | `has_consignment=false` — and `has_consignment=false` clears the consignment |

Each of these is two clicks away and then inexplicable: an empty list for a filter set that looks perfectly reasonable, with nothing on screen saying which half is at fault.

**`Y` flags and booleans are different controls.** `unassigned` and `open` take the literal string `Y` with no documented negative, so they get a two-state `YFlagSelect`; `resolved`, `has_consignment` and `awaiting_first_response` are real booleans and get the three-state control, because "not filtering by this" and "no" are different questions.

**Names are resolved where they are worth resolving.** The API sends `raised_by_name` and `assigned_to_name` as null even when the ids are set. The detail page resolves both through the lookups (two cached requests for one record); the table settles for "Assigned" / "Unassigned", since resolving fifteen ids per page would be fifteen requests for a column nobody sorts by. Remove both workarounds if the API starts sending the names.

**Close is gated on RESOLVED in the UI and the server's refusal is shown in place.** The 422 carries its reason under `errors.status` — "Only a resolved ticket can be closed." — and the confirm dialog renders that sentence rather than a toast, because it is an answer to the button that was just pressed. The mutation re-throws so the dialog stays open.

**The detail page mirrors the admin console's layout** (`depNext-cms`): the two states worth acting on first — nobody has picked it up, awaiting a first response — then an overview grid, what was reported, the resolution if there is one, and the conversation. The two screens are read by people talking to each other about the same record, so a field that sits in a different place on each side is a field they will describe differently. What is deliberately absent is the half that belongs to staff: assignment and the workflow events.

**The thread is read off the detail, not a second endpoint.** `GET {id}` returns `replies` inline — confirmed against the staff console (`depNext-cms`), whose own types document the same shape. A reply posts and then the detail is refetched: the response shape is undocumented and the write has server-side effects (it stamps `first_responded_at`), so nothing is seeded from what comes back.

**The composer has the admin console's two modes, and the server enforces them.** `is_internal` is honoured only for internal callers — a customer cannot post a staff-only note and staff cannot leak one by mistake — so the flag is safe to offer from here and is sent only when true. The switch is two buttons rather than a checkbox, it restyles the whole composer, and it drops back to public after every send: the dangerous direction is believing you are internal when you are public. Nothing in the thread is filtered and nothing is optimistic; after the refetch each message carries the badge for the audience the server actually gave it, so a note that was published says so immediately.

**Close is offered on anything not already closed**, the same rule as the admin console's `canClose`. An earlier version gated it on RESOLVED, from the 422 the endpoint returns — but that is a server-side rule which may differ by caller and by workflow state, and encoding a guess at it left the button permanently disabled on every open ticket, which reads as a broken feature. Now the dialog warns when no resolution is on record, and a refusal comes back carrying the server's own sentence. On a ticket that is already closed the action is dropped rather than disabled: there it is not a rule waiting to be met, it is simply done.

**A closed ticket takes no replies; a resolved one still does.** That window is the customer's chance to disagree with the agent's claim that it is fixed — the same reason close is separate from resolve.

**`corporate_id` is never sent on create.** The API takes it from the session on the corporate endpoints and cannot be overridden.

**No permission gate.** Support is open to every signed-in user of the corporate, and the API scopes the list to their own tickets regardless. `page.tsx` carries a comment saying where a guard would go if a name is introduced.

## Left out

- **Reopening a closed ticket**, and any of the other workflow events the staff console drives (`/events`, `/assign`).
- **`next_allowed_events` / `last_event_code`.** Carried on the type and reported in the timeline as "Last activity" when present, but this portal does not drive the workflow.
- **Assignment from the portal.** `assigned_to` is a filter here, not an action.

## The gate

```bash
npm run lint && npm run typecheck && npm run build
```

`lint` and `typecheck` are green. `build` must be run on the Mac: it downloads a platform-specific SWC binary on first run, which the sandboxed shell has no network to fetch.
