import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LiveSync } from "../realtime/live-sync";
import { createCacheSync } from "../realtime/cache-sync";
import { useCryStatus } from "./useCryStatus";
import { CryAlert } from "./CryAlert";

// Resources whose server-pushed diffs replace the Query cache (echo-only, ADR-0004).
const RESOURCES = ["babies", "summary", "cry-patterns", "growth"];

// Connects the Live-sync stream to the app: mirrors resource diffs into the Query
// cache, and overlays the full-screen cry alert whenever a baby is crying.
export function CryAlertOverlay({ liveSync }: { liveSync: LiveSync }) {
  const queryClient = useQueryClient();
  const status = useCryStatus(liveSync);

  useEffect(
    () => createCacheSync({ liveSync, queryClient, resources: RESOURCES }),
    [liveSync, queryClient],
  );

  if (status.status !== "crying" || !status.episode) return null;
  return (
    <CryAlert
      episode={status.episode}
      onOpen={() => {}}
      onTalk={() => {}}
      onSnooze={() => {}}
    />
  );
}
