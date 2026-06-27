import { useEffect, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";
import { cryStatusReducer, initialCryStatus, type CryStatus, type CryStatusEvent } from "./cry-status";

interface CryStatusData {
  state: "calm" | "fussing" | "crying";
  episodeId?: string;
  babyId?: string;
  babyName?: string;
  cause?: string;
}

function toEvent(data: CryStatusData): CryStatusEvent {
  if (data.state === "crying") {
    return {
      kind: "crying",
      episodeId: data.episodeId ?? "",
      babyId: data.babyId,
      babyName: data.babyName ?? "Your baby",
      cause: data.cause,
    };
  }
  return { kind: data.state };
}

// Applies the cry-status state machine to the `cry-status` events on the
// user-scoped Live-sync stream. Drives the header StatusPill and the cry alert.
export function useCryStatus(liveSync: LiveSync): CryStatus {
  const [status, setStatus] = useState<CryStatus>(initialCryStatus);

  useEffect(
    () =>
      liveSync.on("cry-status", (data) =>
        setStatus((prev) => cryStatusReducer(prev, toEvent(data as CryStatusData))),
      ),
    [liveSync],
  );

  return status;
}
