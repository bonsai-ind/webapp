import type { Session } from "../session/session";
import { LineChart } from "../ui/LineChart";
import { useGrowth } from "./useGrowth";

export function GrowthScreen({ session, babyId }: { session: Session; babyId?: string }) {
  const { growth } = useGrowth(session, babyId);

  return (
    <div className="flex flex-col gap-[18px]">
      <div
        role="group"
        aria-label="Weight"
        className="flex items-baseline gap-2 rounded-card border border-line bg-surface p-[14px]"
      >
        <span className="num text-[23px] font-bold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
          {growth?.weightKg ?? "—"}
        </span>
        <span className="font-mono text-[11.5px] text-ink-3">kg</span>
        {growth && (
          <span className="ml-auto rounded-full bg-primary-soft px-2.5 py-1 text-[11.5px] font-semibold text-primary-700">
            P{growth.weightPercentile}
          </span>
        )}
      </div>
      {growth && <LineChart series={growth.series} label="Weight for age" />}
      {growth && (
        <ul className="overflow-hidden rounded-card border border-line bg-surface">
          {growth.milestones.map((m) => (
            <li
              key={m.label}
              className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13.5px] last:border-b-0"
            >
              {m.done ? (
                <span aria-label="Done" className="text-calm">
                  ✓
                </span>
              ) : (
                <span aria-hidden="true" className="text-ink-3">
                  ☆
                </span>
              )}
              <span className={m.done ? "text-ink" : "text-ink-2"}>{m.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
