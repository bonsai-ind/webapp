// SVG progress ring (DESIGN.md §4): stroke-linecap round, *-soft track,
// centered value + mono caption.
export function Ring({
  value,
  max,
  accent = "sleep",
  label,
  caption,
  size = 120,
}: {
  value: number;
  max: number;
  accent?: "sleep" | "alert" | "feed" | "primary" | "amber";
  label: string;
  caption?: string;
  size?: number;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = max > 0 ? Math.min(value / max, 1) : 0;
  const dashOffset = circumference * (1 - progress);

  const COLORS: Record<typeof accent, { track: string; fill: string }> = {
    sleep:   { track: "var(--sleep-soft)",   fill: "var(--sleep)"   },
    alert:   { track: "var(--alert-soft)",   fill: "var(--alert)"   },
    feed:    { track: "var(--feed-soft)",    fill: "var(--feed)"    },
    primary: { track: "var(--primary-soft)", fill: "var(--primary)" },
    amber:   { track: "var(--amber-soft)",   fill: "var(--amber)"   },
  };
  const { track, fill } = COLORS[accent];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        {/* Track */}
        <circle cx={cx} cy={cx} r={radius} fill="none" stroke={track} strokeWidth={strokeWidth} />
        {/* Progress arc */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke={fill}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span
          className="num text-[26px] font-extrabold text-ink"
          style={{ fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}
        >
          {label}
        </span>
        {caption && (
          <span className="font-mono text-[9px] text-ink-3">{caption}</span>
        )}
      </div>
    </div>
  );
}
