import type { StatAccent } from "./StatTile";

// Solid (highlighted/peak bar) and soft (rest) backgrounds per accent. Literal
// classes so Tailwind keeps them.
const SOLID: Record<StatAccent, string> = {
  sleep: "bg-sleep",
  alert: "bg-alert",
  feed: "bg-feed",
  primary: "bg-primary",
};
const SOFT: Record<StatAccent, string> = {
  sleep: "bg-sleep-soft",
  alert: "bg-alert-soft",
  feed: "bg-feed-soft",
  primary: "bg-primary-soft",
};

export function Bars({
  values,
  peakIndex,
  accent = "primary",
  label,
}: {
  values: number[];
  peakIndex?: number;
  accent?: StatAccent;
  label: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div role="img" aria-label={label} className="flex h-24 items-end gap-0.5">
      {values.map((value, i) => (
        <span
          key={i}
          className={`flex-1 rounded-t ${i === peakIndex ? SOLID[accent] : SOFT[accent]}`}
          style={{ height: `${Math.max((value / max) * 100, 3)}%` }}
        />
      ))}
    </div>
  );
}
