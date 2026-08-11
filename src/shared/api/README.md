# Data layer

Two clients. Both point at `NEXT_PUBLIC_API_BASE_URL`. Pick by whether the call
needs a signed-in user.

```ts
import { privateApiClient, publicApiClient } from "@/shared/api";
```

| | `publicApiClient` | `privateApiClient` |
|---|---|---|
| Base URL | `NEXT_PUBLIC_API_BASE_URL` | `NEXT_PUBLIC_API_BASE_URL` |
| Headers added | — | `Authorization: Bearer`, `X-Corporate-Code` |
| Use for | `/login`, `/forgot-password`, `/meta` | `/me`, everything under `/corporate/*` |

Paths are always relative — the client prefixes the base URL:

```ts
await publicApiClient.post("/login", form);
// → POST https://api.dpnex.com/api/v1/login

await privateApiClient.get("/corporate/users");
// → GET  https://api.dpnex.com/api/v1/corporate/users
//   Authorization: Bearer 81|9HToADbF…
//   X-Corporate-Code: ABCDEF
```

Nothing in the app hardcodes a host. Change `.env`, everything follows.

## Where the token lives

`useAuthStore` (`src/shared/auth/auth-store.ts`), persisted to `localStorage`
under `dpnex.auth`. It holds the whole login response — token, user,
corporates, active corporate code, and an `expiresAt` we set ourselves (the
API issues no `exp` and no refresh token).

`privateApiClient`'s request interceptor reads it on every call. **Services
never touch the token.** The same value is mirrored into a `dpnex_session`
cookie so `proxy.ts` and the `(protected)` layout can gate routes server-side
without a flash of the dashboard.

```ts
import { useAuthStore } from "@/shared/auth/auth-store";

const user = useAuthStore((s) => s.user);
const corporates = useAuthStore((s) => s.corporates);
const active = useAuthStore((s) => s.activeCorporateCode);
```

## Login

```ts
import { login } from "@/shared/api/services/auth.service";

const session = await login({ email, password, remember });
```

`POST /login` takes **multipart, not JSON** — the service builds `FormData`.
Passing a plain object sends `application/json` and comes back 422.

Three gates run on the response, in order, before the store is touched:

1. `user_type !== "CRP"` → wrong portal
2. `disabled === "Y"` or `allow_login === "N"` → *"You are disabled. Please contact Admin / Support to enable the account."*
3. no `corp_code` in `data.corporates` → not linked to a company

Each throws an `ApiError` with status 403. `useLogin` catches those and raises
a titled toast.

> These run in the browser, so a determined user can skip them with devtools.
> They are a correct *product* gate, not a security boundary — the API must
> enforce the same rules. Re-verified on every page load via `GET /me` in
> `getServerUser()`.

## Calling

Every method returns the payload, already unwrapped:

```ts
// GET with query params
const users = await privateApiClient.get<User[]>("/corporate/users", {
  params: { page: 1, per_page: 20, search: term },
  unwrap: "users",              // reads data.users out of the envelope
});

// POST
await privateApiClient.post<Consignment>("/corporate/consignmentrequests", {
  reference,
  boxes,
});

// Paginated list — keeps Laravel's meta block
const { items, meta } = await privateApiClient.paginated<User>(
  "/corporate/users",
  { unwrap: "users", params: { page } },
);

// Full response, when you need headers or the raw body
const response = await privateApiClient.request<Blob>(
  "GET", "/corporate/report", undefined, { responseType: "blob" },
);
```

### Per-call options

| Option | Effect |
|---|---|
| `params` | Query string. `undefined`, `null` and `""` are dropped; arrays become `key[]` |
| `unwrap` | Reads `data.<key>` out of the envelope (also matches a top-level key, for `/me`) |
| `silent` | Suppresses the automatic error toast — for calls that render their own |
| `skipAuthRedirect` | Suppresses the sign-out on 401 — for session probes |
| `retries` | GET only. Retries network faults and 5xx with backoff |
| `responseType` | `"json"` (default), `"blob"`, `"text"` |
| `timeout` | Milliseconds. Defaults to `NEXT_PUBLIC_REQUEST_TIMEOUT_MS` |
| `signal` | Cancellation. Pass React Query's `signal` through |

## Interceptors

Registered per client, run in registration order.

```ts
// Request — mutate and return the config
privateApiClient.interceptors.request.use((config) => {
  config.headers.set("X-Trace-Id", crypto.randomUUID());
  return config;
});

// Response — inspect or reshape
privateApiClient.interceptors.response.use((response) => {
  console.debug(response.status, response.config.url);
  return response;
});

// Error — throw to keep failing, or return an ApiResponse to recover
privateApiClient.interceptors.error.use((error, config) => {
  if (error instanceof ApiError && error.status === 402) showUpgradeDialog();
  throw error;
});
```

`use()` returns an id for `eject(id)`. Already registered on
`privateApiClient`: bearer token, corporate code, dev logging, and the error
handler that toasts and signs out on 401.

The error chain can *return* an `ApiResponse` instead of throwing — that is the
hook a token-refresh-and-retry would use if the API ever ships one.

## Errors

Everything throws `ApiError` — one type, `status` as the discriminant.

```ts
try {
  await createUser(values);
} catch (error) {
  if (isApiError(error) && error.isValidationError) {
    form.setErrors(error.fieldErrors);          // { email: ["already taken"] }
  }
}
```

Helpers: `isNetworkError` (status 0), `isUnauthorized`, `isForbidden`,
`isValidationError`, `isServerError`, and `fieldError("email")` for the first
message on a field.

Messages are chosen for the user, not copied from the server: below 500 the
upstream `message` is shown if it is short and sane; at 500 and above it is
replaced, because those bodies carry stack traces.

## Toasts

```ts
import { toast } from "@/shared/components/toast";

toast.success("Consignment request submitted");
toast.error(error);                   // takes an ApiError, an Error, or a string
toast.warning({ title: "Almost", message: "Two documents are still missing" });
```

Top-right, stacked, 3s each, green for success and red for errors. Hovering
pauses the timer. Failed requests toast themselves — pass `silent: true` when a
call renders its own error and you do not want both.

## Writing a service

One file per resource in `services/`. Components call services, never clients.

```ts
// services/users.service.ts
import { privateApiClient } from "@/shared/api";
import type { User } from "@/shared/auth/types";

export function listUsers(params: { page?: number; search?: string }) {
  return privateApiClient.paginated<User>("/corporate/users", {
    unwrap: "users",
    params,
  });
}

export function createUser(input: CreateUserInput) {
  return privateApiClient.post<User>("/corporate/users", input);
}
```

`services/auth.service.ts` is the worked example.

## CORS

The browser now calls `api.dpnex.com` directly, so the API must return
`Access-Control-Allow-Origin` for every origin you run on — including
`http://localhost:3000` in development — and allow the `Authorization` and
`X-Corporate-Code` headers on preflight.

If a call fails with a CORS error, that is a change on the API side, not here.

## Session lifecycle

There is no server-side session check. The token in the store *is* the
session.

| Event | What happens |
|---|---|
| Login succeeds | `setSession()` writes store + localStorage + cookie, then `location.replace("/dashboard")` |
| Page load / refresh | `proxy.ts` checks the cookie (no flash), `AuthGuard` waits for hydration then renders |
| Any request 401s | interceptor calls `logout()` and replaces to `/login?expired=1` |
| Token past `expiresAt` | `AuthGuard` clears the store, which triggers the redirect |
| Logout clicked | `logout()` + `queryClient.clear()` + `location.replace("/login")` |

**Nothing else sends a user to /login.** A failed request, a slow endpoint or a
network blip leaves the session alone — that was the old behaviour and it is
why login appeared to succeed and then bounce.

### Two things that must stay true

`AuthGuard` must never redirect before `useAuthHydrated()` is true. `persist`
reads localStorage *after* the first render, so for one frame every signed-in
user looks signed out.

`AuthGuard` clears the store before redirecting. The cookie can outlive
localStorage; without the clear, `proxy.ts` sees a session, sends the user to
/dashboard, and the guard sends them back — forever.

### Protecting a page

The `(protected)` group is guarded as a whole. For a permission on top:

```tsx
import { RequirePermission } from "@/shared/auth/require-permission";

export default function UsersPage() {
  return (
    <RequirePermission permission="users.view">
      …
    </RequirePermission>
  );
}
```
