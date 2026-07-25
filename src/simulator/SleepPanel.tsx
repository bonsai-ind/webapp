import { useState } from "react";
import { Panel } from "./Panel";
import type { DeviceSession } from "./device-session";
import { reportSleep } from "./device-api";
import { secondaryButtonClass } from "../ui/forms";

// Device-reported sleep (ADR 0015): one episodeId spans the whole sleep; the
// start posts an open episode, the end reposts it with endedAt + wakings.
export function SleepPanel({ deviceSession }: { deviceSession: DeviceSession }) {
  const [active, setActive] = useState<{ episodeId: string; kind: "night" | "nap"; startedAt: string } | null>(null);
  const [wakings, setWakings] = useState(0);
  const [failed, setFailed] = useState(false);

  async function start(kind: "night" | "nap") {
    const episode = { episodeId: `ep_sim_${crypto.randomUUID()}`, kind, startedAt: new Date().toISOString() };
    setFailed(false);
    try {
      await reportSleep(deviceSession, { ...episode, wakings: 0 });
      setActive(episode);
      setWakings(0);
    } catch {
      setFailed(true);
    }
  }

  async function end() {
    if (!active) return;
    setFailed(false);
    try {
      await reportSleep(deviceSession, {
        ...active,
        endedAt: new Date().toISOString(),
        wakings,
      });
      setActive(null);
    } catch {
      setFailed(true);
    }
  }

  return (
    <Panel title="Sleep">
      {active ? (
        <div className="flex flex-col gap-3 rounded-[14px] bg-sleep-soft p-3">
          <p className="text-[13px] font-semibold text-sleep capitalize">{active.kind} sleep in progress</p>
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] text-ink-2">Wakings: {wakings}</span>
            <button
              type="button"
              onClick={() => setWakings((w) => w + 1)}
              className="h-8 rounded-[10px] border border-line-2 bg-surface px-3 text-[12.5px] font-semibold text-ink-2"
            >
              + waking
            </button>
          </div>
          <button
            type="button"
            onClick={() => void end()}
            className="h-11 rounded-[14px] bg-sleep font-semibold text-white transition-opacity hover:opacity-95"
          >
            Wake up
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => void start("night")}>
            Start night
          </button>
          <button type="button" className={secondaryButtonClass} onClick={() => void start("nap")}>
            Start nap
          </button>
        </div>
      )}
      {failed && <p className="text-[12px] font-medium text-amber">Sleep report failed.</p>}
    </Panel>
  );
}
