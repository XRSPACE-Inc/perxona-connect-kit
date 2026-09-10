import { QueryClient } from "@tanstack/react-query";

import type { ApiError } from "./api";

/**
 * Shared React Query client.
 *
 * Catalog data (avatars/scenes/voices) is effectively static per session, so we
 * cache it aggressively and skip refetches. Auth failures (401/403) are not
 * retried — they signal a server credential problem, not a transient error.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as ApiError).status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});
