import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { LiveSync } from "../realtime/live-sync";
import { createCacheSync } from "../realtime/cache-sync";
import { useCryStatus } from "./useCryStatus";
import { CryAlert } from "./CryAlert";
import { startAlertFeedback, type AlertFeedback } from "./alert-feedback";

// Resources whose server-pushed frames refresh the Query cache (ADR-0004).
const RESOURCES = ["babies", "summary", "cry-patterns", "growth", "temperature"];

const SNOOZE_MS = 5 * 60_000;

// Connects the Live-sync stream to the app: mirrors resource refreshes into the
// Query cache, and overlays the full-screen cry alert whenever a baby is crying.
// onOpenMonitor navigates to the crying baby's Live Monitor (the shell owns nav).
export function CryAlertOverlay({
  liveSync,
  onOpenMonitor,
}: {
  liveSync: LiveSync;
  onOpenMonitor?: (babyId?: string) => void;
}) {
  const queryClient = useQueryClient();
  const status = useCryStatus(liveSync);
  // Snoozed episodes: episodeId → wall-clock time the snooze expires. A REAL
  // snooze — the takeover re-shows after 5 minutes if the episode is still
  // active (a distracted parent must get re-nagged); a NEW episode always shows.
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  // Ticks to re-evaluate snooze expiry while an episode is suppressed.
  const [, setTick] = useState(0);

  useEffect(
    () => createCacheSync({ liveSync, queryClient, resources: RESOURCES }),
    [liveSync, queryClient],
  );

  // Any cry lifecycle frame also refreshes the episode history list (the Cries
  // screen's "Recent episodes"), so a new/ended episode appears without a
  // manual refresh.
  useEffect(
    () =>
      liveSync.on("cry-status", () => {
        void queryClient.invalidateQueries({ queryKey: ["cries"] });
      }),
    [liveSync, queryClient],
  );

  const now = Date.now();
  const active = status.status === "crying" ? status.episode : undefined;
  const snoozed = active !== undefined && (snoozedUntil[active.id] ?? 0) > now;
  const visible = active !== undefined && !snoozed;

  // Re-check an active snooze when it lapses, so the alert re-nags on time.
  useEffect(() => {
    if (!active || !snoozed) return;
    const remaining = snoozedUntil[active.id] - now;
    const timer = setTimeout(() => setTick((t) => t + 1), remaining + 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, snoozed]);

  // Chirp + vibration while the takeover is visible (stops on snooze, calm,
  // open — anything that hides it).
  const feedbackRef = useRef<AlertFeedback | null>(null);
  useEffect(() => {
    if (visible && !feedbackRef.current) {
      feedbackRef.current = startAlertFeedback();
    } else if (!visible && feedbackRef.current) {
      feedbackRef.current.stop();
      feedbackRef.current = null;
    }
    return () => {
      feedbackRef.current?.stop();
      feedbackRef.current = null;
    };
  }, [visible]);

  if (!visible || !active) return null;

  const snooze = () => setSnoozedUntil((s) => ({ ...s, [active.id]: Date.now() + SNOOZE_MS }));
  const open = () => {
    onOpenMonitor?.(active.babyId);
    snooze(); // opening the monitor IS handling it; don't re-takeover mid-call
  };
  return <CryAlert episode={active} onOpen={open} onSnooze={snooze} />;
}
