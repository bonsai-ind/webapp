import type { GrowthMetric } from "../growth/useGrowth";

// A WHO percentile chart: the shaded p3–p97 reference band, a dashed p50 median,
// and the baby's own measurements plotted and connected over age. x = age (days,
// labeled in months), y = the metric value.
export function PercentileChart({ metric }: { metric: GrowthMetric }) {
  const { curves, series, unit, label } = metric;
  if (curves.p50.length < 2) return null;

  const W = 320;
  const H = 190;
  const padL = 6;
  const padR = 24; // room for percentile labels
  const padT = 8;
  const padB = 18;

  const xsAll = [...curves.p50.map((p) => p.ageDays), ...series.map((p) => p.ageDays)];
  const ysAll = [
    ...curves.p3.map((p) => p.value),
    ...curves.p97.map((p) => p.value),
    ...series.map((p) => p.value),
  ];
  const minX = 0;
  const maxX = Math.max(...xsAll);
  const minY = Math.min(...ysAll) * 0.98;
  const maxY = Math.max(...ysAll) * 1.02;

  const sx = (x: number) => padL + ((x - minX) / (maxX - minX || 1)) * (W - padL - padR);
  const sy = (y: number) => H - padB - ((y - minY) / (maxY - minY || 1)) * (H - padT - padB);
  const line = (pts: { ageDays: number; value: number }[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${sx(p.ageDays).toFixed(1)},${sy(p.value).toFixed(1)}`).join(" ");

  // Shaded band = p3 forward + p97 back to close.
  const band =
    line(curves.p3) +
    " " +
    curves.p97
      .slice()
      .reverse()
      .map((p) => `L${sx(p.ageDays).toFixed(1)},${sy(p.value).toFixed(1)}`)
      .join(" ") +
    " Z";

  const monthTicks = [];
  for (let d = 0; d <= maxX; d += 91.3) monthTicks.push(d); // ~quarterly
  const endLabel = (pts: { ageDays: number; value: number }[], text: string) => {
    const last = pts[pts.length - 1];
    return (
      <text x={sx(last.ageDays) + 2} y={sy(last.value) + 3} className="fill-ink-3" style={{ fontSize: 7 }}>
        {text}
      </text>
    );
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${label} for age percentile chart (${unit})`}>
      <path d={band} fill="var(--primary-soft)" opacity="0.45" />
      <path d={line(curves.p15)} fill="none" stroke="var(--line-2)" strokeWidth="1" />
      <path d={line(curves.p85)} fill="none" stroke="var(--line-2)" strokeWidth="1" />
      <path d={line(curves.p50)} fill="none" stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="3 3" />
      {endLabel(curves.p97, "97th")}
      {endLabel(curves.p50, "50th")}
      {endLabel(curves.p3, "3rd")}
      {series.length > 0 && (
        <path
          d={line(series)}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {series.map((p, i) => (
        <circle
          key={i}
          cx={sx(p.ageDays)}
          cy={sy(p.value)}
          r="3.2"
          fill="var(--surface)"
          stroke="var(--primary)"
          strokeWidth="2"
        />
      ))}
      {monthTicks.map((d, i) => (
        <text key={i} x={sx(d)} y={H - 5} textAnchor="middle" className="fill-ink-3" style={{ fontSize: 7 }}>
          {Math.round(d / 30.4)}m
        </text>
      ))}
    </svg>
  );
}
