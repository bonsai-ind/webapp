import type { InsightsData } from "./useInsights";

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// PredictView: the next-nap window (Owlet/Huckleberry style — a window, never a
// point, framed like a weather forecast), bedtime drift, the age-typical nap
// transition, and a reassuring regression card.
export function PredictView({ insights }: { insights: InsightsData }) {
  const p = insights.predictions;

  return (
    <div className="flex flex-col gap-[18px]">
      {p.nextNap ? (
        <section className="rounded-card border border-line bg-surface p-[18px]">
          <p className="label">Next sleep window</p>
          <p className="mt-1 text-[21px] font-extrabold tracking-[-0.02em] text-ink">
            {p.nextNap.basis === "due"
              ? "Due about now"
              : `Likely ${timeOf(p.nextNap.windowStart)} – ${timeOf(p.nextNap.windowEnd)}`}
          </p>
          <p className="mt-1 text-[13px] text-ink-2">
            Start winding down 15–30 minutes before.{" "}
            {p.nextNap.basis === "blended"
              ? "Based on age plus your baby's own recent pattern."
              : "Based on typical wake windows for this age."}
          </p>
          <p className="mt-1.5 text-[11px] text-ink-3">
            Treat this like a weather forecast — a guide, not a schedule. Sleepy cues win.
          </p>
        </section>
      ) : (
        <section className="rounded-card border border-line bg-surface p-[18px]">
          <p className="label">Next sleep window</p>
          <p className="mt-1 text-[13.5px] text-ink-2">
            No prediction right now — baby looks asleep, or there isn't a recent wake-up to anchor on.
          </p>
        </section>
      )}

      <section className="rounded-card border border-line bg-surface p-[18px]">
        <p className="label">Bedtime trend</p>
        {p.bedtimeDrift.direction === "" ? (
          <p className="mt-1 text-[13.5px] text-ink-2">Not enough bedtimes logged yet to spot a trend.</p>
        ) : (
          <p className="mt-1 text-[13.5px] text-ink">
            {p.bedtimeDrift.direction === "steady"
              ? "Bedtime is holding steady week-over-week."
              : `Bedtime has moved ~${Math.abs(p.bedtimeDrift.driftMin)} min ${p.bedtimeDrift.direction} than last week.`}
            {p.bedtimeDrift.flagged && " Worth nudging back toward the usual time."}
          </p>
        )}
      </section>

      {p.napTransition.status !== "stable" && (
        <section className="rounded-card border border-line bg-surface p-[18px]">
          <p className="label">Nap transition</p>
          <p className="mt-1 text-[13.5px] text-ink">
            {p.napTransition.status === "in-progress"
              ? `Many babies drop from ${p.napTransition.currentNaps} to ${p.napTransition.nextNaps} naps around now (typically ${p.napTransition.typicalAge}). Shorter or refused naps are part of the shuffle.`
              : `The ${p.napTransition.currentNaps}→${p.napTransition.nextNaps} nap transition typically lands at ${p.napTransition.typicalAge} — it may be coming up soon.`}
          </p>
        </section>
      )}

      {p.regression.flagged && (
        <div className="rounded-card border border-amber/30 bg-amber-soft p-[18px]">
          <p className="text-[13.5px] font-bold text-amber">
            This looks like the {p.regression.nearMilestoneMonths}-month regression
          </p>
          <p className="mt-1 text-[12.5px] text-amber">
            Wakings and settling are elevated vs. the last month — normal, developmental, and temporary.
            Keep the routine steady.
          </p>
        </div>
      )}

      <p className="text-[10.5px] leading-relaxed text-ink-3">{insights.disclaimer}</p>
    </div>
  );
}
