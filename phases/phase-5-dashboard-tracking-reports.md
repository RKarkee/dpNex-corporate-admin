# Phase 5 — Dashboard, Tracking, Reports

**Status:** not started. Depends on Phase 3.

## Dashboard

The stat cards in `(protected)/dashboard/_components/stat-card.tsx` currently render hardcoded numbers. Wire them to real counts.

Open question: **which counts, and from where.** The reference's dashboard is static too, so there is no endpoint to copy. Either the API has a summary endpoint nobody has mentioned, or these are derived from list endpoints' `meta.total` with `per_page=1` — cheap, and honest about what it is.

Quick actions should route to real pages and hide when the user lacks the permission for the destination.

## Tracking and Reports

**These do not exist in the reference.** They appear in its nav config, but the route folders were never created — clicking them 404s. There is nothing to port and no endpoint inventory.

So this is new work, scoped from your requirements rather than from the reference. Before it can start:

- **Tracking** — is this a consignment status timeline, a public tracking-number lookup, or a live map? Which endpoint serves it?
- **Reports** — which reports, what filters, and is export (CSV/PDF) in scope? Export changes the gateway: it currently streams responses, which is right, but a download needs `content-disposition` passed through — already handled — and a new allowlist prefix.

## Verify

- Gate green.
- Dashboard numbers match what the corresponding list pages show. A stat card that disagrees with its own list is worse than no stat card.
- Loading and error states on every tile — a dashboard that silently shows `0` when a request failed is actively misleading.
- Quick actions respect permissions.

## Recommendation

Do not start this phase on assumptions. Dashboard tiles can be built as soon as the count source is decided; Tracking and Reports need a requirements conversation first, and building them from guesses would produce work that gets thrown away.
