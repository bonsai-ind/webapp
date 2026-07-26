import { useState } from "react";
import type { Session } from "../session/session";
import { Segmented } from "../ui/Segmented";
import { useBabies } from "../babies/useBabies";
import { useInsights } from "./useInsights";
import type { InsightsRange } from "./useInsights";
import { SleepView } from "./SleepView";
import { PredictView } from "./PredictView";
import { GuidanceView } from "./GuidanceView";
import { ReportView } from "./ReportView";
import { ReportOverlay } from "./ReportOverlay";

const SECTIONS = ["Sleep", "Predict", "Guidance", "Report"] as const;
type Section = (typeof SECTIONS)[number];

// The Insights tab: sleep analytics vs age norms, next-nap predictions, a
// plain-language guidance feed, and the pediatrician report — one segmented
// screen over one rich query (ParentHub pattern).
export function InsightsScreen({ session, babyId }: { session: Session; babyId?: string }) {
  const [section, setSection] = useState<Section>("Sleep");
  const [range, setRange] = useState<InsightsRange>("14d");
  const [reportOpen, setReportOpen] = useState(false);
  const { babies } = useBabies(session);
  const baby = babies.find((b) => b.id === babyId);
  const { insights, isLoading } = useInsights(session, babyId, range);

  return (
    <div className="flex flex-col gap-[18px]">
      {insights && (
        <p className="text-[12.5px] text-ink-2">
          {baby?.name ? `${baby.name} · ` : ""}
          {insights.ageBandLabel} patterns, last {insights.range === "7d" ? "7" : insights.range === "30d" ? "30" : "14"} days
        </p>
      )}
      <Segmented options={[...SECTIONS]} value={section} onChange={setSection} />

      {isLoading && <p className="py-8 text-center text-[13px] text-ink-3">Crunching the patterns…</p>}
      {!isLoading && !insights && (
        <p className="py-8 text-center text-[13px] text-ink-3">
          No data yet — insights appear once the monitor starts logging sleep.
        </p>
      )}

      {insights && section === "Sleep" && (
        <SleepView insights={insights} range={range} onRangeChange={setRange} />
      )}
      {insights && section === "Predict" && <PredictView insights={insights} />}
      {insights && section === "Guidance" && <GuidanceView insights={insights} />}
      {section === "Report" && (
        <ReportView
          session={session}
          babyId={babyId}
          babyName={baby?.name}
          onOpenReport={() => setReportOpen(true)}
        />
      )}

      {reportOpen && (
        <ReportOverlay session={session} babyId={babyId} onClose={() => setReportOpen(false)} />
      )}
    </div>
  );
}
