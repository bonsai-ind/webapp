import type { GuidanceTone, InsightsData } from "./useInsights";

// Card chrome per tone: reassure = calm primary, tip = neutral, watch = amber.
const TONE_CARD: Record<GuidanceTone, string> = {
  reassure: "border-primary/25 bg-primary-soft",
  tip: "border-line bg-surface",
  watch: "border-amber/30 bg-amber-soft",
};
const TONE_TITLE: Record<GuidanceTone, string> = {
  reassure: "text-primary",
  tip: "text-ink",
  watch: "text-amber",
};
const TONE_LABEL: Record<GuidanceTone, string> = {
  reassure: "Reassurance",
  tip: "Tip",
  watch: "Worth mentioning",
};

// GuidanceView: the plain-language insights feed — one takeaway per card, each
// with the observation that fired it, never an unexplained verdict.
export function GuidanceView({ insights }: { insights: InsightsData }) {
  return (
    <div className="flex flex-col gap-[14px]">
      {insights.guidance.map((card) => (
        <section key={card.id} className={`rounded-card border p-[18px] ${TONE_CARD[card.tone]}`}>
          <p className={`font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] ${TONE_TITLE[card.tone]}`}>
            {TONE_LABEL[card.tone]}
          </p>
          <h3 className={`mt-1 text-[15px] font-bold ${TONE_TITLE[card.tone]}`}>{card.title}</h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{card.body}</p>
          {card.evidence && (
            <p className="mt-2 border-t border-line/60 pt-2 text-[11.5px] text-ink-3">{card.evidence}</p>
          )}
        </section>
      ))}
      <p className="text-[10.5px] leading-relaxed text-ink-3">
        {insights.disclaimer} This feed is educational, not medical advice.
      </p>
    </div>
  );
}
