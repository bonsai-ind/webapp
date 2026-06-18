interface Point {
  ageWeeks: number;
  kg: number;
}

// Minimal weight-for-age line: primary 2.4px series with a ringed end-dot
// (DESIGN.md). The percentile band + dashed reference series are visual polish
// to layer on later.
export function LineChart({ series, label }: { series: Point[]; label: string }) {
  const W = 300;
  const H = 120;
  const pad = 6;
  const xs = series.map((p) => p.ageWeeks);
  const ys = series.map((p) => p.kg);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const sx = (x: number) => ((x - minX) / (maxX - minX || 1)) * (W - 2 * pad) + pad;
  const sy = (y: number) => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const points = series.map((p) => `${sx(p.ageWeeks)},${sy(p.kg)}`).join(" ");
  const last = series[series.length - 1];

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} className="w-full">
      <polyline
        points={points}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {last && (
        <circle cx={sx(last.ageWeeks)} cy={sy(last.kg)} r="4" fill="var(--surface)" stroke="var(--primary)" strokeWidth="2.4" />
      )}
    </svg>
  );
}
