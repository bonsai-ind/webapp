import type { DayStrip, StripEventType } from "../insights/useInsights";

// Dot colors per overlaid signal — CSS theme vars, matching the accent system.
const DOT_FILL: Record<StripEventType, string> = {
  cry: "var(--alert)",
  temp: "var(--amber)",
  posture: "var(--amber)",
  sos: "var(--alert-2, var(--alert))",
  distress: "var(--alert)",
};

const W = 320;
const PAD_L = 40;
const PAD_R = 6;
const PAD_T = 4;
const ROW_H = 15;
const LANE_H = 9;
const AXIS_H = 14;

// DayStripChart renders one 24-hour lane per day (newest on top): night sleep
// as solid blocks, naps as soft blocks, and any overlaid events (cries, temp
// excursions, posture/SOS/distress) as dots — the "day strip" visualization
// every sleep tracker converges on, and the report grid pediatric guidance
// prefers over tables. Pure SVG, PercentileChart idiom.
export function DayStripChart({ strips, showEvents = true }: { strips: DayStrip[]; showEvents?: boolean }) {
  if (strips.length === 0) return null;
  const H = PAD_T + strips.length * ROW_H + AXIS_H;
  const plotW = W - PAD_L - PAD_R;
  const sx = (min: number) => PAD_L + (Math.min(Math.max(min, 0), 1440) / 1440) * plotW;

  const dayLabel = (date: string) => {
    const d = new Date(`${date}T00:00:00Z`);
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Sleep day strips for the last ${strips.length} days`}
    >
      {strips.map((strip, i) => {
        const y = PAD_T + i * ROW_H;
        const laneY = y + (ROW_H - LANE_H) / 2;
        return (
          <g key={strip.date}>
            <text x={0} y={y + ROW_H / 2 + 2.5} style={{ fontSize: 7 }} className="fill-ink-3">
              {dayLabel(strip.date)}
            </text>
            <rect x={PAD_L} y={laneY} width={plotW} height={LANE_H} rx={3} fill="var(--surface)" />
            {strip.segments.map((seg, j) => (
              <rect
                key={j}
                x={sx(seg.startMin)}
                y={laneY}
                width={Math.max(sx(seg.endMin) - sx(seg.startMin), 1)}
                height={LANE_H}
                rx={2.5}
                fill={seg.kind === "night" ? "var(--sleep)" : "var(--sleep-soft)"}
                stroke={seg.kind === "nap" ? "var(--sleep)" : "none"}
                strokeWidth={seg.kind === "nap" ? 0.8 : 0}
              />
            ))}
            {showEvents &&
              strip.events.map((ev, j) => (
                <circle
                  key={j}
                  cx={sx(ev.atMin)}
                  cy={laneY + LANE_H / 2}
                  r={ev.type === "sos" ? 2.8 : 2.2}
                  fill={DOT_FILL[ev.type]}
                  stroke="var(--surface)"
                  strokeWidth={ev.type === "sos" ? 1.2 : 0.8}
                >
                  <title>{`${ev.type}: ${ev.detail}`}</title>
                </circle>
              ))}
          </g>
        );
      })}
      {[0, 6, 12, 18, 24].map((h) => (
        <text
          key={h}
          x={sx(h * 60)}
          y={H - 3}
          textAnchor={h === 0 ? "start" : h === 24 ? "end" : "middle"}
          style={{ fontSize: 7 }}
          className="fill-ink-3"
        >
          {h === 0 || h === 24 ? "12am" : h === 12 ? "12pm" : h < 12 ? `${h}am` : `${h - 12}pm`}
        </text>
      ))}
    </svg>
  );
}
