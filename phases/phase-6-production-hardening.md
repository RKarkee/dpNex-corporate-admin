# Phase 6 — Production hardening

**Status:** not started.

The work that makes the difference between "it runs" and "it holds up". Parts of this can be pulled earlier — the test framework in particular gets cheaper the sooner it lands.

## Mobile

The shell already has a `Sheet`-based drawer below `lg`, which is more than the reference has — its sidebar is a fixed column that eats 256px on a phone. What still needs doing:

- Audit every page at 360px. Tables must scroll inside their own container; the page body must never scroll horizontally.
- Tap targets at 44px minimum on touch.
- The consignment form from Phase 3 is the hard case — a long nested form on a small screen.

Run `/audit-ui` for the full sweep.

## Performance

- `dynamic()` around heavy dialogs and tab panels. The reference loads its ~1,500-line consignment form as a single chunk with no splitting anywhere in the app.
- Check what the protected shell actually ships. `getServerUser()` runs per full page load; confirm it is not being re-run per navigation.

## Breadcrumbs

`findNavTitle` in `src/shared/config/navigation.ts` already provides everything a breadcrumb trail needs. The component is roughly 30 lines and the nav tree stays the single source of truth.

## Tests

Currently the gate is lint + typecheck + build, which cannot catch a logic error. Proposed:

- **Vitest** for the units where a bug is silent and expensive: `hasPermission` (a wrong answer either hides real features or exposes them), `unwrap` / `normalizeMeta` (envelope drift), `safeNext` (open redirect), and the gateway's path-sanitisation checks.
- **Playwright** for the flows that cannot be unit tested: sign in, session expiry without a redirect loop, logout, and permission-based nav filtering.

The auth surface deserves tests more than anything else here, because its failure modes are silent — an open redirect or a leaked token does not throw.

## CI

A workflow running the gate on every push. Add the test command once it exists. There is no CI in the reference and no branch protection.

## Cleanup to carry from Phase 1

- Decide on the two `window.location.assign` lint warnings: suppress with justification, or leave visible.
- Decide on the `server-only` package.
- Revisit `resolveCorporateCode()` once the `corporates` payload shape is confirmed — it currently accepts several plausible shapes rather than one known one.
- Revisit the cookie lifetimes in `session.ts` once the real token TTL is known.

## Verify

- Gate green, plus the new test command.
- Lighthouse or equivalent on the heaviest page.
- Full keyboard-only pass through one complete flow: sign in → list → create → save → log out.
- Session expiry tested deliberately, not just observed by accident.
