"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { login, type LoginCredentials } from "@/shared/api/services/auth.service";
import { displayName, type LoginSession } from "@/shared/auth/types";
import { toast } from "@/shared/components/toast";

/**
 * Signs in, then routes to the dashboard.
 *
 * A client-side navigation, not a page reload. Nothing in the server tree
 * reads the session any more — `(protected)/layout.tsx` is a pass-through and
 * `AuthGuard` decides from the store — so there is nothing on the server to
 * re-render and no reason to throw away the React tree, the toast that just
 * fired, or the warm bundle.
 *
 * `replace`, not `push`: /login must not sit in history behind the dashboard,
 * or Back lands a signed-in user on the sign-in form.
 */
export function useLogin(next?: string) {
  const router = useRouter();

  return useMutation<LoginSession, Error, LoginCredentials>({
    mutationFn: (credentials) => login(credentials),

    onSuccess: (session) => {
      toast.success(`Welcome back, ${displayName(session.user)}`);

      // The cookie is already written — `setSession` does it synchronously —
      // so `proxy.ts` sees a session on this very navigation.
      router.replace(next ?? "/dashboard");
    },

    onError: (error) => {
      // A disabled account or the wrong portal is not a typo — it needs the
      // toast, not just the inline hint under the form.
      if (isApiError(error) && error.isForbidden) {
        toast.error({ title: "Cannot sign in", message: error.message });
        return;
      }

      toast.error(error);
    },
  });
}
