import { useState } from "react";
import { Panel } from "./Panel";
import { primaryButtonClass } from "../ui/forms";
import type { DeviceSession } from "./device-session";
import { useTemperatureLoop, type SensorSim } from "./useTemperatureLoop";

// Preset targets: each drives the simulated value toward a scenario; the rules
// engine (temperature-rules.ts) opens/closes the anomalies organically.
const ROOM_PRESETS = [
  { label: "Normal 21°", target: 21.0 },
  { label: "Too hot 24°", target: 24.0 },
  { label: "Too cold 14°", target: 14.0 },
  { label: "Fault 99°", target: 99.0 },
] as const;

const BODY_PRESETS = [
  { label: "Normal 37.0°", target: 37.0 },
  { label: "Fever 38.5°", target: 38.5 },
  { label: "Hypo 35.5°", target: 35.5 },
] as const;

function SensorRow({
  name,
  sim,
  presets,
  onTarget,
}: {
  name: string;
  sim: SensorSim;
  presets: readonly { label: string; target: number }[];
  onTarget: (t: number) => void;
}) {
  const activeKinds = Object.keys(sim.active);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-ink-2">{name}</span>
        <span
          className="font-mono text-[15px] font-bold text-ink"
          style={{ fontVariantNumeric: "tabular-nums" }}
          data-testid={`temp-${name.toLowerCase()}`}
        >
          {sim.current.toFixed(1)}°C
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onTarget(p.target)}
            aria-pressed={sim.target === p.target}
            className={
              "rounded-[10px] border px-2.5 py-1.5 text-[12px] font-semibold transition-colors " +
              (sim.target === p.target
                ? "border-primary bg-primary-soft text-primary"
                : "border-line-2 bg-surface text-ink-2 hover:border-ink-3")
            }
          >
            {p.label}
          </button>
        ))}
      </div>
      {activeKinds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeKinds.map((kind) => (
            <span key={kind} className="rounded-full bg-alert-soft px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-alert">
              {kind.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// The device's temperature "firmware" console: an ambient (room) sensor that's
// always on, and an optional body-sensor channel (future wearable). Buttons set
// targets; readings drift there and the on-device rules do the alerting.
export function TemperaturePanel({ deviceSession, enabled }: { deviceSession: DeviceSession; enabled: boolean }) {
  const [bodySensorOn, setBodySensorOn] = useState(false);
  const [sending, setSending] = useState(false);
  const temps = useTemperatureLoop({ deviceSession, enabled, bodySensorOn });

  async function sendNow() {
    setSending(true);
    try {
      await temps.sendNow();
    } finally {
      setSending(false);
    }
  }

  return (
    <Panel title="Temperature">
      <SensorRow name="Room" sim={temps.room} presets={ROOM_PRESETS} onTarget={temps.setRoomTarget} />
      <label className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
        Body sensor (wearable)
        <input
          type="checkbox"
          checked={bodySensorOn}
          onChange={(e) => setBodySensorOn(e.target.checked)}
          className="size-5 accent-(--primary)"
        />
      </label>
      {bodySensorOn && (
        <SensorRow name="Body" sim={temps.body} presets={BODY_PRESETS} onTarget={temps.setBodyTarget} />
      )}
      <button type="button" className={primaryButtonClass} disabled={sending || !enabled} onClick={() => void sendNow()}>
        {sending ? "Sending…" : "Send temperature now"}
      </button>
      <p className="text-[11px] text-ink-3">
        Auto-posts hourly (real-device cadence); Send now pushes a reading immediately. Anomalies
        open/clear via the on-device rules (the firmware contract).
      </p>
    </Panel>
  );
}
