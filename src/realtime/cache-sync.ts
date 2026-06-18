import type { QueryClient } from "@tanstack/react-query";
import type { LiveSync } from "./live-sync";

/**
 * Mirror server-authoritative Live-sync diffs into the TanStack Query cache.
 * Each mirrored resource's event replaces the cached value at [resource]
 * (replacement, never merge — ADR-0004). Returns an unsubscribe.
 */
export function createCacheSync({
  liveSync,
  queryClient,
  resources,
}: {
  liveSync: LiveSync;
  queryClient: QueryClient;
  resources: string[];
}): () => void {
  const unsubscribers = resources.map((resource) =>
    liveSync.on(resource, (data) => {
      queryClient.setQueryData([resource], data);
    }),
  );
  return () => unsubscribers.forEach((off) => off());
}
