import { useEffect, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";
import {
  initialTemperatureAlerts,
  temperatureAlertsReducer,
  type TemperatureAlerts,
  type TemperatureEpisode,
} from "./temperature-status";

interface TemperatureStatusData {
  state: "alert" | "clear";
  episodeId: string;
  babyId?: string;
  babyName?: string;
  sensor?: "room" | "body";
  kind?: string;
  celsius?: number;
}

// Applies the temperature-anomaly state machine to `temperature-status` frames
// on the user-scoped Live-sync stream.
export function useTemperatureStatus(liveSync: LiveSync): TemperatureAlerts {
  const [alerts, setAlerts] = useState<TemperatureAlerts>(initialTemperatureAlerts);

  useEffect(
    () =>
      liveSync.on("temperature-status", (data) => {
        const d = data as TemperatureStatusData | null;
        if (!d?.episodeId) return;
        setAlerts((prev) => {
          if (d.state === "clear") return temperatureAlertsReducer(prev, { kind: "clear", episodeId: d.episodeId });
          const episode: TemperatureEpisode = {
            id: d.episodeId,
            babyId: d.babyId,
            babyName: d.babyName ?? "Your baby",
            sensor: d.sensor ?? "room",
            kind: d.kind ?? "unknown",
            celsius: d.celsius ?? 0,
            startedAt: Date.now(),
          };
          return temperatureAlertsReducer(prev, { kind: "alert", episode });
        });
      }),
    [liveSync],
  );

  return alerts;
}
