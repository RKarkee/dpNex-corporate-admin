"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchFileDataUrl,
  needsResolving,
} from "@/shared/api/services/file.service";

/**
 * Turns a stored file reference into something an `<img>` can load.
 *
 *   const { src } = useFileUrl(user.image_thumbnail ?? user.image);
 *   {src ? <AvatarImage src={src} /> : null}
 *
 * Pass `user.image` straight in. If it is already loadable — a `blob:` preview
 * of a file the user just picked, a `data:` URI, or a link to somewhere other
 * than our API — it comes back unchanged and no request is made. Only our own
 * authenticated file endpoints are fetched.
 *
 * The resolved value is a `data:` URL, so it is an ordinary cached string:
 * a directory of rows fetches each distinct photo once, several components can
 * show the same photo, and nothing has to be revoked. See `file.service.ts`
 * for why that beats `URL.createObjectURL` here.
 */
export function useFileUrl(reference: string | null | undefined) {
  const shouldFetch = needsResolving(reference);

  const query = useQuery({
    queryKey: ["file-url", reference],
    queryFn: ({ signal }) => fetchFileDataUrl(reference as string, signal),
    enabled: shouldFetch,

    // The bytes do not change under a given URL; a new upload gets a new one.
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,

    // A broken avatar is not worth hammering the endpoint over; the caller
    // renders initials, which is a complete answer on its own.
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    /** Ready to put in `src`, or `null` while loading or on failure. */
    src: shouldFetch ? (query.data ?? null) : (reference ?? null),
    isLoading: shouldFetch && query.isPending,
    isError: query.isError,
  };
}
