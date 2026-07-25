import { useEffect, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";
import {
  distressAlertsReducer,
  initialDistressAlerts,
  type DistressAlerts,
  type DistressEpisode,
} from "./distress-status";

interface DistressStatusData {
  state: "alert" | "clear";
  episodeId: string;
  babyId?: string;
  babyName?: string;
  level?: "stress" | "distress" | "emergency";
  cues?: string[];
}

// Applies the behavioral-distress state machine to `distress-status` frames on
// the user-scoped Live-sync stream.
export function useDistressStatus(liveSync: LiveSync): DistressAlerts {
  const [alerts, setAlerts] = useState<DistressAlerts>(initialDistressAlerts);

  useEffect(
    () =>
      liveSync.on("distress-status", (data) => {
        const d = data as DistressStatusData | null;
        if (!d?.episodeId) return;
        setAlerts((prev) => {
          if (d.state === "clear") return distressAlertsReducer(prev, { kind: "clear", episodeId: d.episodeId });
          const episode: DistressEpisode = {
            id: d.episodeId,
            babyId: d.babyId,
            babyName: d.babyName ?? "Your baby",
            level: d.level ?? "distress",
            cues: d.cues ?? [],
            startedAt: Date.now(),
          };
          return distressAlertsReducer(prev, { kind: "alert", episode });
        });
      }),
    [liveSync],
  );

  return alerts;
}
