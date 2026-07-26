import { useState } from "react";
import { Panel } from "./Panel";
import { inputClass, primaryButtonClass } from "../ui/forms";
import type { DeviceSession } from "./device-session";
import { reportGrowthMeasurement } from "./device-api";

const pos = (v: string) => v.trim() !== "" && Number(v) > 0;

// The device's "smart scale" console: report a weigh-in (weight/length/head)
// that auto-appears in the app's Growth chart — the connected-hardware path.
export function GrowthPanel({ deviceSession }: { deviceSession: DeviceSession }) {
  const [weight, setWeight] = useState("");
  const [length, setLength] = useState("");
  const [head, setHead] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const valid = pos(weight) || pos(length) || pos(head);

  async function send() {
    setSending(true);
    setNote("");
    try {
      await reportGrowthMeasurement(deviceSession, {
        ...(pos(weight) ? { weightKg: Number(weight) } : {}),
        ...(pos(length) ? { lengthCm: Number(length) } : {}),
        ...(pos(head) ? { headCircumferenceCm: Number(head) } : {}),
      });
      setNote("Weigh-in sent");
      setWeight("");
      setLength("");
      setHead("");
    } catch {
      setNote("Failed — is the device paired to a baby?");
    } finally {
      setSending(false);
    }
  }

  const rows: Array<[string, string, (v: string) => void]> = [
    ["Weight (kg)", weight, setWeight],
    ["Length (cm)", length, setLength],
    ["Head circ (cm)", head, setHead],
  ];

  return (
    <Panel title="Growth (smart scale)">
      {rows.map(([label, value, set]) => (
        <label key={label} className="flex items-center justify-between gap-2 text-[12.5px] text-ink-2">
          {label}
          <input
            type="number"
            value={value}
            onChange={(e) => set(e.target.value)}
            className={`${inputClass} w-24 text-right`}
          />
        </label>
      ))}
      <button type="button" className={primaryButtonClass} disabled={!valid || sending} onClick={() => void send()}>
        {sending ? "Sending…" : "Send weigh-in"}
      </button>
      {note && <p className="text-[11px] text-ink-3">{note}</p>}
    </Panel>
  );
}
