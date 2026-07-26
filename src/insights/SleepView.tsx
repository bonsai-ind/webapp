import { Segmented } from "../ui/Segmented";
import { StatTile } from "../ui/StatTile";
import { DayStripChart } from "../ui/DayStripChart";
import { clockLabel, hoursLabel } from "./useInsights";
import type { InsightsData, InsightsRange } from "./useInsights";

const RANGE_OPTIONS = ["7d", "14d", "30d"] as const;

// Legend for the strip overlay dots.
const LEGEND: { label: string; className: string }[] = [
  { label: "Night", className: "bg-sleep" },
  { label: "Nap", className: "bg-sleep-soft border border-sleep" },
  { label: "Cry", className: "bg-alert" },
  { label: "Temp/posture", className: "bg-amber" },
];

export function SleepView({
  insights,
  range,
  onRangeChange,
}: {
  insights: InsightsData;
  range: InsightsRange;
  onRangeChange: (r: InsightsRange) => void;
}) {
  const s = insights.sleep;
  const totalH = s.avgTotalMin / 60;
  const inBand = totalH >= s.typicalTotal.minH && totalH <= s.typicalTotal.maxH;

  return (
    <div className="flex flex-col gap-[18px]">
      <Segmented options={[...RANGE_OPTIONS]} value={range} onChange={onRangeChange} />

      <div className="grid grid-cols-2 gap-2.5">
        <StatTile label="Avg sleep / day" value={hoursLabel(s.avgTotalMin)} accent="sleep" />
        <StatTile
          label="Night wakings"
          value={s.nightWakings.avgPerNight}
          unit="/night"
          accent={s.nightWakings.avgPerNight > s.nightWakings.priorAvg + 0.5 ? "alert" : "sleep"}
        />
        <StatTile label="Longest stretch" value={hoursLabel(s.longestStretchMin)} accent="primary" />
        <StatTile
          label="Time to settle"
          value={s.onsetLatency.coveragePct > 0 ? `${s.onsetLatency.avgMin}m` : "—"}
          accent="amber"
        />
        <StatTile label="Bedtime" value={clockLabel(s.bedtime.meanMinuteOfDay)} accent="primary" />
        <StatTile
          label="Sleep efficiency"
          value={s.efficiencyPct > 0 ? s.efficiencyPct : "—"}
          unit={s.efficiencyPct > 0 ? "%" : undefined}
          accent={s.efficiencyPct >= 70 || s.efficiencyPct === 0 ? "sleep" : "amber"}
        />
      </div>

      {/* Typical-for-age band. */}
      <section className="rounded-card border border-line bg-surface p-[18px]">
        <p className="label">Typical for {insights.ageBandLabel}</p>
        <p className="mt-1 text-[14px] text-ink">
          <span className="font-bold">
            {s.typicalTotal.minH}–{s.typicalTotal.maxH} hours
          </span>{" "}
          of sleep per day ({s.typicalTotal.source}).{" "}
          {s.avgTotalMin > 0 &&
            (inBand
              ? `${insights.range === "7d" ? "This week" : "This period"}: ${hoursLabel(s.avgTotalMin)} — inside the typical range.`
              : `This period: ${hoursLabel(s.avgTotalMin)}.`)}
        </p>
        <p className="mt-1.5 text-[12px] text-ink-2">
          Night {hoursLabel(s.avgNightMin)} · Naps {hoursLabel(s.avgNapMin)} ({s.naps.avgPerDay}/day) ·
          Wake windows ~{hoursLabel(s.naps.avgWakeWindowMin)} (typical{" "}
          {hoursLabel(s.naps.typicalWakeWindow.minMin)}–{hoursLabel(s.naps.typicalWakeWindow.maxMin)})
        </p>
      </section>

      {/* Bedtime consistency callout (evidence-backed metric). */}
      {s.consistencyFlag && (
        <div className="rounded-card border border-amber/30 bg-amber-soft p-[14px] text-[13px] text-amber">
          Bedtime varied by about ±{s.bedtime.sdMin} minutes
          {s.bedtime.driftMinVsPriorWeek !== 0 &&
            ` and drifted ${Math.abs(s.bedtime.driftMinVsPriorWeek)} min ${s.bedtime.driftMinVsPriorWeek > 0 ? "later" : "earlier"} vs last week`}
          . Consistent bedtimes are linked to longer sleep.
        </div>
      )}

      {/* Day strips with the all-signal overlay. */}
      <section className="rounded-card border border-line bg-surface p-[18px]">
        <p className="label">Sleep timeline</p>
        <div className="mt-2">
          <DayStripChart strips={insights.strips} />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {LEGEND.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 text-[10.5px] text-ink-3">
              <span className={`size-2 rounded-full ${l.className}`} aria-hidden="true" />
              {l.label}
            </span>
          ))}
        </div>
      </section>

      <p className="text-[10.5px] leading-relaxed text-ink-3">{insights.disclaimer}</p>
    </div>
  );
}
