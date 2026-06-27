import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LiveSync } from "../realtime/live-sync";
import { createCacheSync } from "../realtime/cache-sync";
import { useCryStatus } from "./useCryStatus";
import { CryAlert } from "./CryAlert";

// Resources whose server-pushed diffs replace the Query cache (echo-only, ADR-0004).
const RESOURCES = ["babies", "summary", "cry-patterns", "growth"];

// Connects the Live-sync stream to the app: mirrors resource diffs into the Query
// cache, and overlays the full-screen cry alert whenever a baby is crying.
// onOpenMonitor/onTalk navigate to the crying baby's Live Monitor (the shell owns
// nav); both take the episode's babyId so the right baby/device is targeted.
export function CryAlertOverlay({
  liveSync,
  onOpenMonitor,
  onTalk,
}: {
  liveSync: LiveSync;
  onOpenMonitor?: (babyId?: string) => void;
  onTalk?: (babyId?: string) => void;
}) {
  const queryClient = useQueryClient();
  const status = useCryStatus(liveSync);
  // Episode the user has acknowledged/snoozed: hide the takeover for it so the
  // alert isn't a permanent trap (the cry-status stays "crying" until a calm
  // frame). Keyed by episode id, so a NEW cry re-shows and a replayed/duplicate
  // frame for the same episode stays dismissed.
  const [dismissedEpisodeId, setDismissedEpisodeId] = useState<string>();

  useEffect(
    () => createCacheSync({ liveSync, queryClient, resources: RESOURCES }),
    [liveSync, queryClient],
  );

  if (status.status !== "crying" || !status.episode) return null;
  if (status.episode.id === dismissedEpisodeId) return null;

  const episode = status.episode;
  const dismiss = () => setDismissedEpisodeId(episode.id);
  // Open/Talk navigate to the crying baby's Live Monitor (the call auto-connects
  // there; Talk is the on-screen push-to-talk), then clear the takeover. Snooze
  // just clears it.
  const open = () => { onOpenMonitor?.(episode.babyId); dismiss(); };
  const talk = () => { onTalk?.(episode.babyId); dismiss(); };
  return <CryAlert episode={episode} onOpen={open} onTalk={talk} onSnooze={dismiss} />;
}
