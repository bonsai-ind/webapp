import { useEffect, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";
import {
  safetyStatusReducer,
  initialSafetyStatus,
  type SafetyStatus,
  type SafetyStatusEvent,
  type Posture,
} from "./safety-status";

interface SafetyStatusData {
  state: "alert" | "clear";
  posture?: Posture;
  episodeId?: string;
  babyId?: string;
  babyName?: string;
}

function toEvent(data: SafetyStatusData): SafetyStatusEvent {
  if (data.state === "alert") {
    return {
      kind: "alert",
      episodeId: data.episodeId ?? "",
      babyId: data.babyId,
      babyName: data.babyName ?? "Your baby",
      posture: data.posture ?? "unknown",
    };
  }
  return { kind: "clear" };
}

// Applies the safety state machine to the `safety-status` events on the
// user-scoped Live-sync stream. Drives the prone/occlusion safety banner.
export function useSafetyStatus(liveSync: LiveSync): SafetyStatus {
  const [status, setStatus] = useState<SafetyStatus>(initialSafetyStatus);

  useEffect(
    () =>
      liveSync.on("safety-status", (data) =>
        setStatus((prev) => safetyStatusReducer(prev, toEvent(data as SafetyStatusData))),
      ),
    [liveSync],
  );

  return status;
}
