# Phase 13 — Check Rate / Track

**Status:** code complete — awaiting your verification. `tsc` and `eslint` pass on the source; `npm run build` has to run on the Mac.

A port of the customer portal's **Check Rate / Track** page (`logistic-cargo-web-app` → `app/dashboard/rate-track`), on the corporate endpoints. It behaves the same as the customer portal: quotes are for reference, and the notice links to Consignment Request to ship.

## Structure

```
src/app/(protected)/rate-track/
├── page.tsx                      RequirePermission + Suspense
├── permissions.ts · types.ts
├── lib/                          normalize-track, format, errors
├── services/rate-track.service.ts
├── _hooks/                       check-rates, track-shipment, permissions, place-names
└── _components/
    ├── rate-track-view.tsx · rate-track-tabs.tsx · info-item.tsx
    ├── check-rate/               panel, form, schema, results, rate-card, notice
    └── track/                    panel, form, result
```

Shared code touched:
- `nav-constant.ts` — **Check Rate / Track** under Dashboard.
- `use-meta-options.ts` — `trackingTypeOptions` / `trackingEntryOptions` and their `/meta` defaults.
- `consignments/request/_components/location-fields.tsx` — `optionalStateCity` (drops the required marker from State and City).

## Endpoints

```
POST /corporate/check-rates   receiver_country (required); receiver_state, receiver_city,
                              receiver_zip, receiver_address_1/2, package_type, item_type
                              (optional); total_weight OR boxes[] (one required)
POST /corporate/track         tracking_no; type?, entry? (from /meta)
```

`/corporate/track` is the agreed path "for now" — the customer portal uses `/external/track`.

## Decisions

**Same required/optional rules as the customer portal.** Only the country is required, plus a total weight or at least one box with all four measures. This is looser than the consignment request's own rate step (which requires state, city, ZIP, package type and boxes) — that step is unchanged.

**Permissions.** Page/menu: `view_rate` or `track_consignment`. Check rate tab: `view_rate`. Track tab: `track_consignment`. A user with only one sees only that tab (no tab bar).

**Matches the customer portal as it is**, including two quirks worth fixing in both apps together: the Lowest/Fastest badges are keyed on `customer_rate_id`, which several quotes can share (so more than one card can carry a badge), and the summary line shows the package-type code rather than its name.

## Verify

1. Sidebar shows **Check Rate / Track** for Corporate Admin.
2. Quote with only a country + total weight → cards, cheapest first, Lowest/Fastest badges.
3. Box mode: add/remove boxes; each measure must be > 0.
4. "Go to Consignment Request" in the notice opens the request create page.
5. Track tab: a known tracking number shows summary, parties and history; an unknown one shows the API's message.

## The gate

```bash
npm run lint && npm run typecheck && npm run build
```
