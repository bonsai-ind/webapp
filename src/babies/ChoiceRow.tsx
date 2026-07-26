// A labeled row of toggle chips where the current value can be cleared by
// tapping it again (for optional fields like sex / delivery type).
export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | "";
  onChange: (v: T | "") => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.13em] text-ink-3">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? "" : o.value)}
            className={
              "rounded-[10px] border px-3 py-1.5 text-[13px] font-semibold transition-colors " +
              (value === o.value
                ? "border-primary bg-primary-soft text-primary"
                : "border-line-2 bg-surface text-ink-2 hover:border-ink-3")
            }
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
