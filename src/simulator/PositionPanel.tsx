import { useState } from "react";
import { Panel } from "./Panel";
import type { DeviceSession } from "./device-session";
import { reportPosition } from "./device-api";
import { secondaryButtonClass } from "../ui/forms";

// Position alerts (ADR 0017): a prone/occlusion alert opens and clears under
// one device-minted episodeId, riding the same safety spine as a cry.
export function PositionPanel({ deviceSession }: { deviceSession: DeviceSession }) {
  const [active, setActive] = useState<{ episodeId: string; posture: "face_down_or_absent" | "occluded" } | null>(null);
  const [failed, setFailed] = useState(false);

  async function open(posture: "face_down_or_absent" | "occluded") {
    const episodeId = `ep_sim_${crypto.randomUUID()}`;
    setFailed(false);
    try {
      await reportPosition(deviceSession, {
        episodeId,
        state: "alert",
        posture,
        faceVisible: false,
        confidence: 0.9,
        modelVersion: "sim",
      });
      setActive({ episodeId, posture });
    } catch {
      setFailed(true);
    }
  }

  async function clear() {
    if (!active) return;
    setFailed(false);
    try {
      await reportPosition(deviceSession, {
        episodeId: active.episodeId,
        state: "clear",
        posture: "face_up",
        faceVisible: true,
        confidence: 0.95,
        modelVersion: "sim",
      });
      setActive(null);
    } catch {
      setFailed(true);
    }
  }

  return (
    <Panel title="Position">
      {active ? (
        <div className="flex flex-col gap-3 rounded-[14px] bg-alert-soft p-3">
          <p className="text-[13px] font-semibold text-alert">
            {active.posture === "occluded" ? "Face covered" : "Prone / face not visible"}
          </p>
          <button
            type="button"
            onClick={() => void clear()}
            className="h-11 rounded-[14px] bg-alert font-semibold text-white transition-opacity hover:opacity-95"
          >
            Clear — face visible again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => void open("face_down_or_absent")}>
            Prone alert
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => void open("occluded")}>
            Face covered
          </button>
        </div>
      )}
      {failed && <p className="text-[12px] font-medium text-amber">Position report failed.</p>}
    </Panel>
  );
}
