import type { QueryClient } from "@tanstack/react-query";
import type { LiveSync } from "./live-sync";

/**
 * Bridge server-authoritative Live-sync frames into the TanStack Query cache.
 *
 * A frame invalidates the resource's queries by KEY PREFIX rather than writing
 * the payload directly: the per-baby hooks cache under [resource, babyId]
 * (useBabyResource), while the frame doesn't name a baby — a prefix
 * invalidation reaches every variant and TanStack refetches the authoritative
 * value. Still server-driven (the refetch happens because the server said the
 * value changed — no optimistic writes, ADR-0004), and it fixes the frames
 * previously landing on orphan [resource] keys nothing read.
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
    liveSync.on(resource, () => {
      void queryClient.invalidateQueries({ queryKey: [resource] });
    }),
  );
  return () => unsubscribers.forEach((off) => off());
}
