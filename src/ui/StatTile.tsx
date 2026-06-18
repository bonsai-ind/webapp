export type StatAccent = "sleep" | "alert" | "feed" | "primary";

// Fixed class strings per accent (Tailwind needs literal classes, not built ones).
const CHIP: Record<StatAccent, string> = {
  sleep: "bg-sleep-soft text-sleep",
  alert: "bg-alert-soft text-alert",
  feed: "bg-feed-soft text-feed",
  primary: "bg-primary-soft text-primary",
};

export function StatTile({
  label,
  value,
  unit,
  accent = "primary",
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: StatAccent;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-col gap-2 rounded-card border border-line bg-surface p-[14px]"
    >
      <span className={`size-[30px] rounded-[9px] ${CHIP[accent]}`} aria-hidden="true" />
      <div className="leading-none">
        <span className="num text-[23px] font-bold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
          {value}
        </span>
        {unit && <span className="ml-0.5 font-mono text-[11.5px] text-ink-3">{unit}</span>}
      </div>
      <span className="text-[11.5px] text-ink-2">{label}</span>
    </div>
  );
}
