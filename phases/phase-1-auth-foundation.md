# Phase 1 — Auth foundation

**Status:** code complete, gate green, awaiting your verification.
**Branch:** `corporate_login`

Replaces the mock login with real authentication, and does it through a BFF so the token never reaches client JavaScript.

## 1.5 — Corporate corrections

The first cut was built from the `depNext-cms` source and failed on first contact with the real API: *"This account does not have access to the corporate panel."*

**`depNext-cms` is not a reference for corporate auth.** It only calls `/admin/*` and never sends `X-Corporate-Code`. It is still a good reference for component and form patterns — nothing more. The Postman collection is the authority.

What was wrong, and what changed:

| Problem | Fix |
|---|---|
| `GET /me` requires `X-Corporate-Code`; nothing sent it → 401 → login rejected | `upstreamFetch()` takes a `corporateCode` and sets the header. One injection point |
| The corporate code was unknown | Read from `data.user.corporates` in the login response — no extra round-trip, no `switch-company` |
| Session was one cookie | Two: `dpnex_session` (token) + `dpnex_corp` (code), set and cleared together |
| `getServerUser()` read `body.data.user` | `/me` puts the user at the **top level** (`body.user`). The envelope differs per endpoint |
| Gateway allowlisted `/admin/*` | Now `me`, `meta`, `corporate/` only. A corporate session reaching `/admin/*` is an escalation |
| `CORPORATE_SCOPE_ENABLED` query-param scoping | Deleted. The API scopes by header, not by param — the flag implemented a mechanism that does not exist |
| `name: string`, but the API returns `null` | `name: string \| null` plus a `displayName()` helper. `getInitials(user.name)` would have thrown on the shell's first render |
| Two failure paths shared one error message | Every path now has distinct copy and logs the upstream status + body snippet |

The last row is the one that cost the most: a header bug presented as an account-permissions problem, so the log said nothing useful. Distinct messages and real status logging are why the next failure will take one run instead of a Postman session.

## What changed

### The architecture

The browser never talks to `api.dpnex.com`. It talks to this app, and this app talks to the API.

```
browser ──POST /api/auth/login (FormData)──► login route ──► API POST /login
                                                  │
                                            httpOnly cookie
                                                  │
browser ──GET /api/gateway/<path>──► gateway route ──Bearer──► API
```

Three consequences: the token is not readable by JavaScript, so XSS cannot steal it; the upstream URL stays server-side; and unauthenticated users are redirected before any JS ships.

### Files added

| File | Role |
|---|---|
| `src/proxy.ts` | Route gate. Presence-checks the cookie, redirects with `?next=` |
| `src/app/api/auth/login/route.ts` | Credentials → upstream login → session cookie |
| `src/app/api/auth/logout/route.ts` | POST (from the UI) and GET (from the layout) → clears the cookie |
| `src/app/api/gateway/[...path]/route.ts` | Authenticated passthrough to the API |
| `src/shared/auth/upstream.ts` | Base URL, credentialed fetch, path allowlist, corporate-code resolution |
| `src/shared/auth/session.ts` | Cookie constants, `getSessionCredentials()`, `getServerUser()`, `safeNext()` |
| `src/shared/auth/session-context.tsx` | `SessionProvider` / `useSession()` |
| `src/shared/auth/permissions.ts` | `hasPermission()` / `hasAnyPermission()` |
| `src/shared/auth/require-permission.ts` | Server-side page guard |
| `src/shared/api/client.ts` | `apiFetch<T>()` — hits `/api/gateway/*`, holds no token |
| `src/shared/api/unwrap.ts` | `unwrap<T>(body, key)` + `normalizeMeta()` |
| `src/shared/api/errors.ts` | `ApiError` + user-facing copy per status |
| `src/shared/api/types.ts` | `ApiEnvelope`, `RawMeta`, `PageMeta` |

### Files deleted

`src/shared/auth/auth-store.ts`, `auth-guard.tsx`, `auth-api.ts` (the only mock in the repo), and `src/shared/types/index.ts` (held only the fake `Role` union and `AuthUser`).

### Files edited

`(protected)/layout.tsx` (now async, resolves the user server-side), `protected-layout.tsx`, `sidebar.tsx` (**both** call sites), `user-menu.tsx`, `navigation.ts`, `use-login.ts`, `login-form.tsx`, `login/page.tsx`, `query-provider.tsx`, the three guarded pages, `.env.example`.

## Decisions worth knowing

**`API_BASE_URL`, not `NEXT_PUBLIC_API_BASE_URL`.** The two disagreed before; the server-only name is correct now that nothing client-side needs the URL.

**Login proves the token before setting a cookie.** After the upstream login succeeds, the route calls `/me` with the fresh token and fails the sign-in if that fails. One extra round-trip, and it prevents an infinite redirect: cookie set → layout's `/me` fails → `/login` → gate sees the cookie → `/dashboard` → repeat.

**A failed `/me` redirects through the logout handler,** not straight to `/login`. A Server Component cannot clear a cookie, so going direct would leave the dead cookie in place and cause the same loop.

**The gate is not the authorisation boundary.** `src/proxy.ts` only sees that a cookie exists — checking validity would mean an upstream call on every navigation and prefetch. The real check is `/me` in the protected layout; the real authority is the API. Same for permissions: `filterNavByPermission` hides links, `requirePermission` blocks pages, and neither is access control.

**The gateway is a proxy onto our backend,** so it runs five checks before forwarding: authentication, same-origin on non-GET, path-segment sanitisation, post-construction origin verification, and a prefix allowlist (`me`, `meta`, `corporate/`) that 404s on a miss so it cannot be enumerated. **Adding an endpoint group in a later phase means adding its prefix to `ALLOWED_PREFIXES` in `src/shared/auth/upstream.ts`.**

**`middleware.ts` → `proxy.ts`.** Next 16 deprecates the old name and warns on every build. The BFF route moved to `/api/gateway/*` so the two "proxy" concepts do not collide.

**Corporate scoping is a header.** `X-Corporate-Code` is attached by `upstreamFetch()` on every upstream call, so no feature module ever handles it. The code comes from `data.user.corporates` at login and lives in the `dpnex_corp` cookie for the session's lifetime.

## Verify

Gate — currently green:

```bash
npm run lint && npm run typecheck && npm run build
```

Without credentials, with `npm run dev` running:

```bash
curl -i localhost:3000/dashboard          # 307 → /login?next=%2Fdashboard
curl -i localhost:3000/api/gateway/me     # 401 JSON, not HTML
curl -i localhost:3000/api/gateway/../../etc   # 404
curl -i localhost:3000/api/gateway/admin/users # 404 (admin/ is not allowlisted)
```

With real credentials — none of this can be faked:

- [ ] Sign in with a corporate (`CRP`) account
- [ ] DevTools → Application → Cookies: **both** `dpnex_session` and `dpnex_corp`, both HttpOnly ✓
- [ ] DevTools → Console: `document.cookie` does not contain the token
- [ ] DevTools → Network: no `Authorization` and no `X-Corporate-Code` on any browser request
- [ ] View source: the token appears nowhere in the HTML
- [ ] `curl -i localhost:3000/api/gateway/corporate/consignmentrequests` with the session cookie → 200
- [ ] The user menu shows "Crpadmin Test" — proving the `name: null` path works
- [ ] Read the account's real `permissions` map; confirm the sidebar filters sensibly
- [ ] Delete the cookie mid-session → next navigation lands on `/login?expired=1` **without looping**
- [ ] Repeat with a hand-corrupted cookie value
- [ ] Sign in from `/login?next=/users` → lands on `/users`
- [ ] Log out → **both** cookies cleared → cannot reach `/dashboard` with the back button

## Known gaps

**Two lint warnings, both deliberate and left in place.** `user-menu.tsx:47` and `client.ts:44` use `window.location.assign()`, which the Next plugin says should be `router.push()`. It should not be: both are session teardown, and only a full document navigation discards the React tree, the TanStack Query cache, and the in-memory session together, while forcing the server to re-read the cookie. Suppressing them needs an `eslint-disable`, which `INSTRUCTION.md` §3 says requires your approval — say the word and I will add it with the justification, or leave them as visible warnings.

**`server-only` is not installed.** `session.ts` and `upstream.ts` handle tokens and must never be imported by a `"use client"` module. Today that holds by construction; the `server-only` package would make a violation a build error instead of a silent leak. One dependency, official, zero runtime cost — needs your approval per `INSTRUCTION.md` §1.

**Only the login path has met the live API.** The `X-Corporate-Code` requirement and the `/me` envelope were found that way and are fixed. Everything past sign-in — the gateway against `/corporate/*`, the permission map, the sidebar — is still unproven against a real response.

**The shape of `corporates` is inferred.** `resolveCorporateCode()` accepts an object or a list, under `code` / `corporate_code` / `corp_code` / `slug`. If none match it logs the actual keys and fails the login with an accurate message rather than guessing.

**Cookie lifetime is invented.** 8 hours default, 30 days with "Remember me". There is no `exp` to read and no refresh token, so these are policy. Both constants live in `session.ts`.

**Login error copy is generic by design.** Upstream messages are logged server-side only, never forwarded — they leak internal detail and are not written for end users.
