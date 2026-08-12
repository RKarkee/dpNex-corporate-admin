import { privateApiClient } from "@/shared/api/private-client";
import { API_BASE_URL } from "@/shared/config/env";

/**
 * Loading an authenticated image.
 *
 * `user.image` is **not** something an `<img>` can fetch. It is an endpoint
 * that returns the image *bytes*, and only to a caller carrying the bearer
 * token:
 *
 *   "image":           "https://api.dpnex.com/api/v1/files/pp/27/original"
 *   "image_thumbnail": "https://api.dpnex.com/api/v1/files/pp/27/thumb"
 *
 * Putting that straight into `src` fails: the browser issues its own request
 * with no `Authorization` header, gets a 401, and the avatar silently falls
 * back to initials. So the bytes are fetched through the client that knows
 * about the token, and turned into a `data:` URL.
 *
 * **Why a data URL and not `URL.createObjectURL`.** An object URL is a handle
 * that must be revoked, and revoking it correctly under `reactStrictMode` is a
 * trap: React double-invokes effects in development, so a cleanup that revokes
 * on unmount fires immediately after mount and leaves the `src` pointing at a
 * handle the browser has already released — a blank image in dev only. Every
 * fix for that is either a leak or a `setState` inside an effect.
 *
 * A data URL is an inert string. Nothing to revoke, nothing to leak, safe to
 * cache and share between components. It costs ~33% over the raw bytes, which
 * is the right trade for profile photos. Revisit it for anything large, where
 * an object URL and a deliberate owner would pay for themselves.
 */

/**
 * Turns the stored reference into a path the client can prefix.
 *
 * `buildUrl()` decides "is this absolute?" by looking at the *base*, not the
 * path — so handing it an absolute reference yields
 * `https://api.dpnex.com/api/v1/https://api.dpnex.com/...`. Stripping the base
 * here keeps that logic untouched and leaves one place that knows about it.
 *
 * Returns `null` for anything pointing off our API, which is the signal not to
 * fetch it at all.
 */
export function toApiPath(reference: string): string | null {
  const trimmed = reference.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) return trimmed;
  if (!trimmed.startsWith(API_BASE_URL)) return null;

  return trimmed.slice(API_BASE_URL.length) || null;
}

/** A reference we must fetch ourselves, rather than hand straight to `<img>`. */
export function needsResolving(reference: string | null | undefined): boolean {
  if (!reference?.trim()) return false;

  // Already loadable: a data URI, a blob from a file the user just picked, or
  // anything hosted somewhere other than our API.
  if (/^(data:|blob:)/i.test(reference)) return false;

  return toApiPath(reference) !== null;
}

/** `Blob` → `data:image/jpeg;base64,…`, which an `<img>` can load directly. */
function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the image."));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the image."));
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches an authenticated image and returns a `src` for it.
 *
 * `responseType: "blob"` stops the client trying to parse JPEG bytes as JSON.
 * `silent` because a missing avatar is not worth a toast — the caller shows
 * initials, which is a complete answer on its own — and `skipAuthRedirect` so
 * one stale image reference can never sign the user out.
 */
export async function fetchFileDataUrl(
  reference: string,
  signal?: AbortSignal,
): Promise<string> {
  const path = toApiPath(reference);
  if (!path) throw new Error(`Not an API file reference: ${reference}`);

  const blob = await privateApiClient.get<Blob>(path, {
    responseType: "blob",
    silent: true,
    skipAuthRedirect: true,
    signal,
  });

  // A 200 carrying an HTML error page would otherwise become an `<img>` that
  // renders nothing, with no clue why.
  if (!(blob instanceof Blob) || !blob.type.startsWith("image/")) {
    throw new Error(`Expected an image, got ${(blob as Blob)?.type || "nothing"}`);
  }

  return toDataUrl(blob);
}
