// Timeline list row (DESIGN.md §4): 32×32 tonal icon chip + title + optional
// sub-tag + mono timestamp. Hairline divider on all but last.
export function TimelineRow({
  icon,
  title,
  tag,
  time,
  chipBg = "bg-primary-soft text-primary",
}: {
  icon: React.ReactNode;
  title: string;
  tag?: string;
  time: string;
  chipBg?: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0">
      <span
        className={`size-8 shrink-0 rounded-[9px] flex items-center justify-center ${chipBg}`}
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">{title}</p>
        {tag && (
          <span className="mt-0.5 inline-block rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[9px] text-ink-3">
            {tag}
          </span>
        )}
      </div>
      <span className="ml-auto shrink-0 font-mono text-[10px] text-ink-3">{time}</span>
    </div>
  );
}
