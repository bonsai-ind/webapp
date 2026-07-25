import { useEffect, useRef, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";

export interface SosAlert {
  sosId: string;
  kind: "ambulance" | "doctor" | "other";
  babyId?: string;
  babyName: string;
}

// Subscribes to `emergency` Live-sync frames — a family member raising SOS. A
// `seen` guard stops a Last-Event-ID replay re-firing the same alert.
export function useSosAlert(liveSync: LiveSync): { alert?: SosAlert; dismiss: () => void } {
  const [alert, setAlert] = useState<SosAlert>();
  const seen = useRef(new Set<string>());

  useEffect(
    () =>
      liveSync.on("emergency", (data) => {
        const d = data as { sosId?: string; kind?: SosAlert["kind"]; babyId?: string; babyName?: string } | null;
        if (!d?.sosId || seen.current.has(d.sosId)) return;
        seen.current.add(d.sosId);
        setAlert({ sosId: d.sosId, kind: d.kind ?? "other", babyId: d.babyId, babyName: d.babyName ?? "your baby" });
      }),
    [liveSync],
  );

  return { alert, dismiss: () => setAlert(undefined) };
}
