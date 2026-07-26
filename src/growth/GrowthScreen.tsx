import { useState } from "react";
import type { Session } from "../session/session";
import { Segmented } from "../ui/Segmented";
import { PercentileChart } from "../ui/PercentileChart";
import { AddGrowthForm } from "./AddGrowthForm";
import { useGrowth, type GrowthMetric } from "./useGrowth";

const SHORT: Record<GrowthMetric["metric"], string> = { weight: "Weight", length: "Length", head: "Head" };

const ordinal = (n: number) => {
  const r = Math.round(n);
  const s = ["th", "st", "nd", "rd"];
  const v = r % 100;
  return `${r}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

function CurrentCard({ metric }: { metric: GrowthMetric }) {
  if (!metric.current) {
    return (
      <div className="rounded-card border border-line bg-surface p-[18px] text-[13px] text-ink-2">
        No {metric.label.toLowerCase()} logged yet — tap ＋ to add one.
      </div>
    );
  }
  const c = metric.current;
  const t = metric.tracking;
  return (
    <div className="flex flex-col gap-1.5 rounded-card border border-line bg-surface p-[18px]">
      <p className="label">{metric.label}</p>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[26px] font-bold text-ink" style={{ fontVariantNumeric: "tabular-nums" }}>
          {c.value}
        </span>
        <span className="font-mono text-[12px] text-ink-3">{metric.unit}</span>
        <span className="ml-auto rounded-full bg-primary-soft px-2.5 py-1 text-[12px] font-semibold text-primary-700">
          {ordinal(c.percentile)} pct
        </span>
      </div>
      {t && <p className="text-[12.5px] text-ink-2">{t.text}</p>}
    </div>
  );
}

function VelocityRow({ metric }: { metric: GrowthMetric }) {
  const v = metric.velocity;
  if (!v) return null;
  const tone = v.onTrack ? "text-calm" : "text-amber";
  return (
    <div className="flex items-center justify-between rounded-card border border-line bg-surface px-[18px] py-3 text-[13px]">
      <span className="text-ink-2">Gaining</span>
      <span className={`font-semibold ${tone}`}>
        {v.perWeek} {v.unit}
      </span>
      <span className="text-ink-3">
        expected {v.expectedLow}–{v.expectedHigh}
      </span>
    </div>
  );
}

export function GrowthScreen({ session, babyId }: { session: Session; babyId?: string }) {
  const { growth } = useGrowth(session, babyId);
  const [metricKey, setMetricKey] = useState<GrowthMetric["metric"]>("weight");
  const [adding, setAdding] = useState(false);

  if (!growth) {
    return <p className="text-[13px] text-ink-3">Loading…</p>;
  }

  const metrics = growth.metrics ?? [];
  const metric = metrics.find((m) => m.metric === metricKey) ?? metrics[0];
  const options = metrics.map((m) => SHORT[m.metric]);
  const crossed = metric?.tracking?.status === "crossed_down" || metric?.tracking?.status === "crossed_up";

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-ink-3">
          {growth.correctedAge ? "Percentiles use corrected age (born preterm)." : "WHO Child Growth Standards"}
        </p>
        <button
          type="button"
          onClick={() => setAdding((a) => !a)}
          aria-label="Add measurement"
          aria-expanded={adding}
          className="grid size-9 place-items-center rounded-full bg-primary text-[20px] font-bold leading-none text-white"
        >
          ＋
        </button>
      </div>

      {adding && <AddGrowthForm session={session} babyId={babyId} onDone={() => setAdding(false)} />}

      {growth.reminder.due && (
        <div className="rounded-card border border-amber/30 bg-amber-soft px-[18px] py-3 text-[13px] font-medium text-amber">
          {growth.reminder.label}
        </div>
      )}

      {metric && (
        <>
          {options.length > 1 && (
            <Segmented
              options={options}
              value={SHORT[metric.metric]}
              onChange={(label) => {
                const m = metrics.find((x) => SHORT[x.metric] === label);
                if (m) setMetricKey(m.metric);
              }}
            />
          )}
          <CurrentCard metric={metric} />
          <PercentileChart metric={metric} />
          <VelocityRow metric={metric} />
          {crossed && metric.tracking && (
            <div className="rounded-card border border-amber/30 bg-amber-soft px-[18px] py-3 text-[13px] text-amber">
              {metric.tracking.text}
            </div>
          )}
        </>
      )}

      {growth.feedingAdequacy.status !== "unknown" && (
        <div className="flex flex-col gap-1 rounded-card border border-line bg-surface p-[18px]">
          <p className="label">Feeding</p>
          <p className="text-[13.5px] text-ink">{growth.feedingAdequacy.text}</p>
          <p className="text-[10.5px] text-ink-3">A feeding signal — not a weight estimate.</p>
        </div>
      )}

      {growth.milestones.length > 0 && (
        <ul className="overflow-hidden rounded-card border border-line bg-surface">
          {growth.milestones.map((m) => (
            <li key={m.label} className="flex items-center gap-2 border-b border-line px-4 py-3 text-[13.5px] last:border-b-0">
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

      <p className="text-[10.5px] text-ink-3">
        Based on WHO Child Growth Standards. A screening aid, not a diagnosis — discuss any concerns with your
        pediatrician.
      </p>
    </div>
  );
}
