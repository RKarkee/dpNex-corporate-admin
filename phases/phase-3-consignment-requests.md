# Phase 3 — Consignment Requests

**Status:** not started. Depends on Phase 2.

The highest-value corporate module, built end to end. Every later module is a copy of its shape, so the shape matters more than the feature.

## Structure

Colocation-first per [CLAUDE.md](../CLAUDE.md) — everything only this route uses stays inside it:

```
src/app/(protected)/consignments/request/
├── page.tsx                     list
├── new/page.tsx
├── [id]/page.tsx                detail
├── [id]/edit/page.tsx
├── _components/                 form, field groups, boxes manager, dialogs
├── _hooks/use-consignment-requests.ts
├── _api/consignment-requests.ts
├── _schema/consignment.schema.ts
└── _types/
```

The reference splits this — service in `lib/api/`, everything else colocated — and its own docs call that out as a mistake. Keep it in one slice.

## Endpoints

**The corporate namespace, not `/admin/*`.** From the Postman collection:

```
GET    /corporate/consignmentrequests           params: page, per_page
POST   /corporate/consignmentrequests
GET    /corporate/consignmentrequests/{id}
PATCH  /corporate/consignmentrequests/{id}      note: PATCH, not PUT
DELETE /corporate/consignmentrequests/{id}
POST   /corporate/consignmentrequests/{id}/restore

  …/{id}/boxes[/{boxId}]            …/{id}/boxes/{boxId}/items[/{itemId}]
  …/{id}/documents[/{docId}]        …/{id}/locations[/{locId}]
  …/{id}/charges[/{chargeId}]
```

Also available and likely needed: `GET /corporate/consignments` (+ `boxes`, `items`, `documents`, `locations`) — the read-only view of accepted consignments.

`corporate/` is on the gateway allowlist, and `X-Corporate-Code` is attached server-side by `upstreamFetch()`, so nothing in this module handles either.

Payload is flat with nested `sender` / `receiver` / `boxes[] → items[]`, plus `agent_code`, `via_code`, `integrator_code`, `service_code`, `package_type`, `urgency`, `ship_date`, `need_pickup: "Y"|"N"`, `declared_value`/`currency`, `nature_of_goods`, `have_hscode`.

The admin form's `customer_id` / `corporate_id` fields are almost certainly not settable here — the corporate is implied by the header. Confirm against a real `POST` before building those inputs.

Booleans stay `"Y"|"N"` end to end — that is the API's convention, and converting at the boundary only moves the conversion somewhere less visible.

## Two deliberate departures from the reference

**Server-side search.** A debounced `search` in the query key, sent to the API. The reference filters the current page client-side, so its search only ever looks at the 10 rows already loaded — it silently misses everything else.

**Split the form.** The reference's `consignment-form.tsx` is 1,658 lines. Break it into named field-group components over one shared RHF instance, the way its own `user-form-fields.tsx` does. One form instance, several components — not several forms.

## Verify

- Gate green.
- List: loading, empty, error, and populated states all correct; pagination and per-page work against real `meta`.
- Search returns results from beyond page 1 — the specific thing the reference gets wrong.
- Create → appears in the list. Edit → the form hydrates from a fresh `GET /{id}`, not from the row already on screen.
- A failed submit keeps the dialog open and the user's input intact; 422 field errors map onto the right fields.
- Nested boxes/items add, remove, and validate.
- Keyboard-navigable throughout; every icon-only button has an accessible name.

## Open questions

- Which fields are corporate users actually allowed to set? The reference exposes the full admin form; some of it may not belong here.
- Is the rate-check / `selected_rate` flow in scope, or admin-only?
