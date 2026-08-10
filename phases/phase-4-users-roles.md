# Phase 4 — Corporate-scoped Users & Roles

**Status:** not started. Depends on Phase 3 (reuses its module shape).

Where the Super Admin portal offers a choice, this portal forces the corporate answer.

## Endpoints — the corporate namespace

The corporate API has its own user and role management. `/admin/users` and `/admin/roles` are **not** used and are not on the gateway allowlist.

```
GET|POST      /corporate/users
GET|PATCH|DELETE  /corporate/users/{id}
POST          /corporate/users/{id}/updateRoles

GET|POST      /corporate/roles
GET|PATCH|DELETE  /corporate/roles/{id}
GET           /corporate/permissions
```

Note `updateRoles` is a **separate endpoint** — role assignment is not part of the user PATCH. That is a real difference from the Super Admin portal, where roles are posted with the user as repeated `roles[]` entries.

## What the corporate scoping means here

Because `X-Corporate-Code` is attached to every request server-side, the corporate is implied by the session. There is nothing to force in the UI and no corporate picker to hide — the endpoints simply cannot return or create anything outside the caller's corporate.

That deletes most of what this phase was originally scoped to do. What remains:

- `user_type` is presumably forced to `CRP` (or omitted entirely — the corporate endpoint may set it). Confirm against a real `POST` rather than sending a value the API ignores.
- Role `scope` may not exist on `/corporate/roles` at all. The Super Admin portal's three-way `global`/`corporate`/`branch` selector has no meaning in a corporate-scoped namespace.

**Verify both against a real request before building form controls for them.** The reference's field-name inconsistency (`corporate_id` vs `corporate`) may also not apply here.

## Gateway allowlist

`corporate/` covers all of the above. No change needed.

## Verify

- Gate green.
- The user list contains only this corporate's users — verified against a second corporate account if one exists.
- Creating a user works without sending `corporate_id` anywhere in the payload.
- Role assignment via `updateRoles` persists and reloads.
- `GET /corporate/permissions` returns a set appropriate to a corporate admin (see below).
- Deep-linking to a user id from another corporate is refused by the API, and the UI handles the refusal without a blank screen.

## Open question

Does `GET /corporate/permissions` already return only the permissions a corporate admin may grant? If it returns the full global set — including `master_data_setups.*` — the UI needs an allowlist, and that list has to come from the backend team. Check this before building the permission matrix, not after.
