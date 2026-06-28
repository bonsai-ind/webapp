import { useState } from "react";
import type { Session } from "../session/session";
import { useSleep, type SleepRange } from "./useSleep";
import { Ring } from "../ui/Ring";
import { Segmented } from "../ui/Segmented";

type Period = "Day" | "Week" | "Month";

const PERIODS: Period[] = ["Day", "Week", "Month"];

const RANGE_FOR: Record<Period, SleepRange> = {
  Day: "day",
  Week: "week",
  Month: "month",
};

const RIBBON_HOURS = ["00", "06", "12", "18", "24"];

export function SleepScreen({
  session,
  babyId,
}: {
  session: Session;
  babyId?: string;
}) {
  const [period, setPeriod] = useState<Period>("Day");
  const { sleep } = useSleep(session, babyId, RANGE_FOR[period]);

  const achievedHours = sleep?.achievedHours ?? 0;
  const goalHours = sleep?.goalHours ?? 1; // avoid div-by-zero in Ring
  const ringLabel = sleep ? `${sleep.achievedHours}h` : "—";
  const ringCaption = sleep ? `of ${sleep.goalHours}h goal` : undefined;

  return (
    <div className="flex flex-col gap-[18px]">
      {/* 1. Segmented control */}
      <Segmented<Period>
        options={PERIODS}
        value={period}
        onChange={setPeriod}
      />

      {/* 2. Sleep stats row: Ring + stat lines */}
      <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-[14px]">
        {/* Ring */}
        <div className="shrink-0">
          <Ring
            value={achievedHours}
            max={goalHours}
            accent="sleep"
            label={ringLabel}
            caption={ringCaption}
            size={110}
          />
        </div>

        {/* Stat lines */}
        <div className="flex flex-col gap-[10px]">
          <div className="flex flex-col gap-[2px]">
            <span className="label">Night</span>
            <span
              className="num text-[17px] font-bold text-ink"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {sleep ? `${sleep.nightHours}h` : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="label">Naps</span>
            <span
              className="num text-[17px] font-bold text-ink"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {sleep ? `${sleep.napHours}h` : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-[2px]">
            <span className="label">Wakings</span>
            <span
              className="num text-[17px] font-bold text-ink"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {sleep ? `${sleep.wakings}` : "—"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. 24h sleep ribbon */}
      <div className="rounded-card border border-line bg-surface p-[14px]">
        <span className="label mb-[10px] block">Sleep timeline</span>

        {/* Ribbon bar */}
        <div className="relative h-4 w-full overflow-hidden rounded-full bg-line">
          {sleep?.periods.map((p, i) => {
            const clampedEnd = Math.min(p.endHour, 24);
            const left = (p.startHour / 24) * 100;
            const width = ((clampedEnd - p.startHour) / 24) * 100;
            return (
              <div
                key={i}
                aria-hidden="true"
                className="absolute top-0 h-full"
                style={{
                  left: `${left}%`,
                  width: `${Math.max(width, 0)}%`,
                  backgroundColor:
                    p.type === "night" ? "var(--sleep)" : "#A9B3EE",
                }}
              />
            );
          })}
        </div>

        {/* Hour axis labels */}
        <div className="mt-1 flex justify-between">
          {RIBBON_HOURS.map((h) => (
            <span
              key={h}
              className="font-mono text-[9px] text-ink-3"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {h}
            </span>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-[10px] flex gap-4">
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: "var(--sleep)" }}
            />
            <span className="font-mono text-[9px] font-medium text-ink-3 uppercase tracking-[0.13em]">
              Night
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="block h-2 w-2 rounded-full"
              style={{ backgroundColor: "#A9B3EE" }}
            />
            <span className="font-mono text-[9px] font-medium text-ink-3 uppercase tracking-[0.13em]">
              Nap
            </span>
          </div>
        </div>
      </div>

      {/* 4. Insight card */}
      {sleep?.insight && (
        <div className="rounded-card bg-sleep-soft p-4 text-[13.5px] font-medium text-sleep">
          {sleep.insight}
        </div>
      )}
    </div>
  );
}
