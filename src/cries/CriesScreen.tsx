import type { Session } from "../session/session";
import { StatTile } from "../ui/StatTile";
import { Bars } from "../ui/Bars";
import { useCryPatterns } from "./useCryPatterns";
import { fussiestWindow } from "./fussiest-window";

// Accent per cause label — locked semantic colors (DESIGN.md §3.1).
const CAUSE_ACCENT: Record<string, string> = {
  Hungry: "var(--feed)",
  Tired: "var(--sleep)",
  Discomfort: "var(--amber)",
  Other: "var(--ink-3)",
};

function causeColor(label: string): string {
  return CAUSE_ACCENT[label] ?? "var(--primary)";
}

// Ranked horizontal progress bar for a single likely cause.
function CauseRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-[88px] shrink-0 text-[12.5px] font-medium text-ink-2">{label}</span>
      <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: causeColor(label) }}
        />
      </div>
      <span className="w-8 text-right font-mono text-[10px] text-ink-3">{pct}%</span>
    </div>
  );
}

export function CriesScreen({ session, babyId }: { session: Session; babyId?: string }) {
  const { patterns } = useCryPatterns(session, babyId);
  const peak = patterns ? fussiestWindow(patterns.hourly) : undefined;
  const maxCause = patterns?.likelyCauses
    ? Math.max(...patterns.likelyCauses.map((c) => c.value))
    : 0;

  return (
    <div className="flex flex-col gap-[18px]">
      {/* 2-up hero stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Avg/day" value={patterns?.avgPerDay ?? "—"} accent="alert" />
        <StatTile
          label="Avg settle"
          value={patterns?.avgSettleTimeMins ?? "—"}
          unit={patterns?.avgSettleTimeMins !== undefined ? "min" : undefined}
          accent="amber"
        />
      </div>

      {/* Fussiest-window callout */}
      {peak && (
        <p className="label text-[10px]">
          Fussiest around {String(peak.hour).padStart(2, "0")}:00
        </p>
      )}

      {/* Hourly distribution */}
      {patterns && (
        <Bars values={patterns.hourly} peakIndex={peak?.hour} accent="alert" label="Cries by hour" />
      )}

      {/* Likely causes */}
      {patterns?.likelyCauses && patterns.likelyCauses.length > 0 && (
        <section>
          <p className="label mb-[10px]">Likely cause</p>
          <div className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-3">
            {patterns.likelyCauses.map((c) => (
              <CauseRow key={c.label} label={c.label} value={c.value} max={maxCause} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
