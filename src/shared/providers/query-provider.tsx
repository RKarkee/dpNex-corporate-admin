"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/components/toast/toast";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        // Nothing the user can retry into working: a 401 redirects, a 403/404
        // is a settled answer, a 422 is their input. Only transient faults
        // deserve a second attempt.
        retry: (failureCount, error) => {
          if (isApiError(error) && [401, 403, 404, 422].includes(error.status)) {
            return false;
          }
          return failureCount < 1;
        },
      },
      mutations: {
        // Mutations are never retried — a duplicate POST creates a duplicate row.
        retry: false,
        // A failed mutation with no local `onError` would otherwise fail
        // silently. The client interceptor already toasted anything it saw;
        // this catches errors thrown from `onSuccess` and elsewhere.
        onError: (error) => {
          if (!isApiError(error)) toast.error(error);
        },
      },
    },
  });
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
