import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";
import { THRESHOLDS } from "../simulator/temperature-rules";

interface Reading {
  celsius: number;
  at: string;
}
interface SamplePoint {
  sensor: "room" | "body";
  celsius: number;
  at: string;
}
interface TemperatureData {
  room?: Reading;
  body?: Reading;
  samples: SamplePoint[];
  activeAlerts: { episodeId: string; sensor: string; kind: string; celsius: number }[];
}

// Range tint: calm inside the safe band, amber at the edges, alert beyond —
// same thresholds the device alerts on (temperature-rules.ts).
function roomTone(c: number): string {
  if (c >= THRESHOLDS.room.tooHotOpen || c <= THRESHOLDS.room.tooColdOpen) return "text-alert";
  if (c > 22.2 || c < 18) return "text-amber";
  return "text-calm";
}
function bodyTone(c: number): string {
  if (c >= THRESHOLDS.body.feverOpen || c <= THRESHOLDS.body.hypothermiaOpen) return "text-alert";
  if (c > 37.5 || c < 36.5) return "text-amber";
  return "text-calm";
}

// Compact room-temperature sparkline over the recent samples (oldest → newest).
function Sparkline({ samples }: { samples: SamplePoint[] }) {
  const room = samples.filter((s) => s.sensor === "room").slice(0, 24).reverse();
  if (room.length < 2) return null;
  const W = 120;
  const H = 28;
  const ys = room.map((s) => s.celsius);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const points = room
    .map((s, i) => `${(i / (room.length - 1)) * W},${H - 3 - ((s.celsius - min) / (max - min || 1)) * (H - 6)}`)
    .join(" ");
  return (
    <svg role="img" aria-label="Room temperature trend" viewBox={`0 0 ${W} ${H}`} className="h-7 w-[120px]">
      <polyline points={points} fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Today-screen nursery climate card: current room + body readings tinted by the
// safe ranges, a trend sparkline, and an inline note for any open anomaly.
// Live: the `temperature` cache frame invalidates ["temperature", babyId].
export function TemperatureCard({ session, babyId }: { session: Session; babyId?: string }) {
  const { data } = useBabyResource<TemperatureData>(session, babyId, "temperature");
  if (!data || (!data.room && !data.body)) return null; // no sensor reporting yet

  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-[18px]">
      <p className="label">Nursery climate</p>
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-5">
          {data.room && (
            <div>
              <p className="text-[11px] text-ink-3">Room</p>
              <p
                className={`font-mono text-[22px] font-bold ${roomTone(data.room.celsius)}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {data.room.celsius.toFixed(1)}°C
              </p>
            </div>
          )}
          {data.body && (
            <div>
              <p className="text-[11px] text-ink-3">Body</p>
              <p
                className={`font-mono text-[22px] font-bold ${bodyTone(data.body.celsius)}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {data.body.celsius.toFixed(1)}°C
              </p>
            </div>
          )}
        </div>
        <Sparkline samples={data.samples} />
      </div>
      {data.activeAlerts.length > 0 && (
        <p className="text-[12px] font-medium text-alert">
          {data.activeAlerts.map((a) => a.kind.replace(/_/g, " ")).join(", ")} — check the nursery
        </p>
      )}
      <p className="text-[10.5px] text-ink-3">Safe sleep range 20–22°C</p>
    </section>
  );
}
