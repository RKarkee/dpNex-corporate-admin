# Build phases

The Corporate Admin Portal is built in phases. Each has its own file here with scope, files touched, verification steps, and what it deliberately leaves out.

**Working agreement:** one phase at a time. A phase ends when its checks pass and you have verified it yourself. The next phase does not start until you say so.

| Phase | Scope | Status |
|---|---|---|
| [1](phase-1-auth-foundation.md) | BFF auth, session, permissions, HTTP layer | ✅ Code complete (incl. 1.5 corporate fixes) — awaiting your verification |
| [2](phase-2-shared-data-layer.md) | DataTable, Pagination, AsyncCombobox, forms, toasts | ⬜ Not started |
| [3](phase-3-consignment-requests.md) | Consignment Requests — the template module | ⬜ Not started |
| [4](phase-4-users-roles.md) | Corporate-scoped Users & Roles | ⬜ Not started |
| [5](phase-5-dashboard-tracking-reports.md) | Dashboard, Tracking, Reports | ⬜ Not started |
| [6](phase-6-production-hardening.md) | Mobile nav, code splitting, tests, CI | ⬜ Not started |
| [7](phase-7-approval-requests.md) | Approval Requests — credit limit, discount, info updates | ✅ Code complete — awaiting your verification |

## The gate

No test framework exists yet (Phase 6 adds one), so this is the only automated check:

```bash
npm run lint && npm run typecheck && npm run build
```

Every phase must leave all three green.

## Background

- **Reference project:** `../depNext-cms` — the live Super Admin Portal. `docs/SUPER_ADMIN_PORTAL_REFERENCE.md` there is the source for the API contract and the module patterns.
- **Conventions:** [CLAUDE.md](../CLAUDE.md) (architecture) and [INSTRUCTION.md](../INSTRUCTION.md) (binding rules).
- **Branch:** `corporate_login`.

## Verified API contract

From the Postman collection (`Dpnex.postman_collection_27jul2026`, 496 requests) and confirmed against live responses.

| | |
|---|---|
| Base | `https://api.dpnex.com/api/v1`, in `API_BASE_URL` (server-only) |
| Login | `POST /login`, **multipart FormData** (`email`, `password`) — not JSON |
| Login response | `{ status, message, data: { token, user } }` — two levels |
| Current user | `GET /me` → `{ user: … }` — **top level**, not under `data`. The envelope varies per endpoint |
| Auth | `Authorization: Bearer <token>` |
| **Corporate scope** | **`X-Corporate-Code: <code>` is mandatory** on `/me` and on all 72 `/corporate/*` endpoints. A *code* (`CDEFGH`), not the numeric `corporate_id`. Found on `data.user.corporates` at login |
| Refresh | **None.** No refresh token, no server-side logout endpoint |
| Lists | Laravel `{ data: { <resource>: [] }, meta: { current_page, last_page, per_page, total, from, to, links } }` |
| Enums | `GET /meta` → `data.controls.<name>.values` as `{key,label}[]` |

### Namespace

This portal uses **`/corporate/*` exclusively**. `/admin/*` is the Super Admin portal's surface and is not on the gateway allowlist.

`/corporate/consignmentrequests` (+ `boxes`, `items`, `documents`, `locations`, `charges`) · `/corporate/consignments` · `/corporate/users` · `/corporate/roles` · `/corporate/permissions` · `/corporate/profile` · `/corporate/kycdocuments` · `/corporate/addresses`

> **`depNext-cms` is not a reference for corporate auth or endpoints.** It only ever calls `/admin/*` and never sends `X-Corporate-Code`. It remains a good reference for component patterns and form conventions — nothing more.

## Standing risks

Carried across every phase. Details in the phase files.

1. **Empty permissions** — if the account's `permissions` map is missing or empty, permission-filtered nav collapses to Dashboard and every guarded page redirects. Unsettled; the first real `/me` response decides it.
2. **Token lifetime is unknown** — no `exp`, no refresh. Cookie durations are our policy, not a fact.
3. **Logout does not revoke** — it clears our cookies; the token stays valid upstream until it expires.
4. **Permission strings are assumed** from the reference (`users.view`, `consignments.view`). The corporate API may name them differently, which would render an empty sidebar.
5. **Multi-company users** — `POST /switch-company` exists, so a user may belong to several corporates. If `corporates` is a list, a company picker belongs between login and dashboard. Not yet in any phase.
6. **The corporate token may differ from the login token** — the collection keeps `corpLoginToken` separate from `loginToken`. If `/corporate/*` rejects the login token, `switch-company` is required after all.
