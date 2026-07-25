import { useState } from "react";
import { Panel } from "./Panel";
import { Segmented } from "../ui/Segmented";
import { inputClass, primaryButtonClass } from "../ui/forms";
import type { DeviceSession } from "./device-session";
import { reportFeeding } from "./device-api";

// Device-reported feed (ADR 0015): bottle carries volumeMl, breast carries
// durationSeconds. Logged as an instantaneous completed feed.
export function FeedingPanel({ deviceSession }: { deviceSession: DeviceSession }) {
  const [method, setMethod] = useState<"bottle" | "breast">("bottle");
  const [volumeMl, setVolumeMl] = useState("120");
  const [durationMin, setDurationMin] = useState("15");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function log() {
    setBusy(true);
    setNote(null);
    const now = new Date().toISOString();
    try {
      await reportFeeding(deviceSession, {
        episodeId: `ep_sim_${crypto.randomUUID()}`,
        method,
        startedAt: now,
        endedAt: now,
        ...(method === "bottle"
          ? { volumeMl: Number(volumeMl) || 0 }
          : { durationSeconds: (Number(durationMin) || 0) * 60 }),
      });
      setNote("Feed logged.");
    } catch {
      setNote("Feed report failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Feeding">
      <Segmented options={["bottle", "breast"]} value={method} onChange={setMethod} />
      {method === "bottle" ? (
        <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
          Volume (ml)
          <input
            type="number"
            value={volumeMl}
            onChange={(e) => setVolumeMl(e.target.value)}
            className={`${inputClass} w-24 flex-none`}
          />
        </label>
      ) : (
        <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
          Duration (min)
          <input
            type="number"
            value={durationMin}
            onChange={(e) => setDurationMin(e.target.value)}
            className={`${inputClass} w-24 flex-none`}
          />
        </label>
      )}
      <button type="button" className={primaryButtonClass} disabled={busy} onClick={() => void log()}>
        Log feed
      </button>
      {note && <p className="text-[12px] font-medium text-ink-2">{note}</p>}
    </Panel>
  );
}
