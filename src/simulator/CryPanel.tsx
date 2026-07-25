import { useState } from "react";
import { Panel } from "./Panel";
import { ApiError } from "../api/get-json";
import type { DeviceSession } from "./device-session";
import { reportCry } from "./device-api";

// The webapp renders the cause verbatim ("Likely hungry"), so these stay lowercase.
const CRY_TYPES = ["hungry", "tired", "discomfort", "pain", "other"] as const;

// One tap = one Cry Episode onset with a device-minted episodeId (ADR 0011);
// "Baby calmed" closes the same episode. Red only while the episode is live.
export function CryPanel({ deviceSession }: { deviceSession: DeviceSession }) {
  const [active, setActive] = useState<{ episodeId: string; cryType: string } | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(state: "crying" | "calm", episodeId: string, cryType: string) {
    setBusy(true);
    setNote(null);
    try {
      await reportCry(deviceSession, {
        episodeId,
        state,
        cryType,
        confidence: 0.92,
        modelVersion: "sim",
        audioDurationSeconds: 4,
      });
      setActive(state === "crying" ? { episodeId, cryType } : null);
    } catch (err) {
      setNote(
        err instanceof ApiError && err.status === 429
          ? "Rate-limited (per-device cry ceiling) — wait a moment."
          : "Cry report failed — check the backend.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Cry detection">
      {active ? (
        <div className="flex flex-col gap-3 rounded-[14px] bg-alert-soft p-3">
          <p className="text-[13px] font-semibold text-alert">
            Crying — likely {active.cryType}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send("calm", active.episodeId, active.cryType)}
            className="h-11 rounded-[14px] bg-alert font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-40"
          >
            Baby calmed
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {CRY_TYPES.map((cryType) => (
            <button
              key={cryType}
              type="button"
              disabled={busy}
              onClick={() => void send("crying", `ep_sim_${crypto.randomUUID()}`, cryType)}
              className="h-12 rounded-[14px] border border-line-2 bg-surface font-semibold capitalize text-ink-2 transition-colors hover:border-ink-3 disabled:opacity-40"
            >
              {cryType}
            </button>
          ))}
        </div>
      )}
      {note && <p className="text-[12px] font-medium text-amber">{note}</p>}
    </Panel>
  );
}
