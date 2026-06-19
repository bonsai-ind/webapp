interface SegmentedProps<T extends string> {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <div className="rounded-[13px] bg-[#ECECF2] p-1 flex">
      {options.map((option) => {
        const isActive = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={
              "flex-1 rounded-[10px] py-1.5 text-[13px] font-semibold transition-all " +
              (isActive
                ? "bg-surface text-ink shadow-[0_1px_4px_rgba(22,23,31,0.12)]"
                : "text-ink-2")
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
