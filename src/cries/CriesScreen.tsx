import type { Session } from "../session/session";
import { StatTile } from "../ui/StatTile";
import { Bars } from "../ui/Bars";
import { TimelineRow } from "../ui/TimelineRow";
import { formatRelativeTime } from "../notifications/relative-time";
import { useCryPatterns } from "./useCryPatterns";
import { useCryHistory, type CryHistoryItem } from "./useCryHistory";
import { fussiestWindow } from "./fussiest-window";

// Accent per cause — locked semantic colors (DESIGN.md §3.1). Keys are
// lowercase: the device's cryType is lowercase on the wire, and seeded fixture
// labels are normalized on lookup, so both sources hit the same accent.
const CAUSE_ACCENT: Record<string, string> = {
  hungry: "var(--feed)",
  tired: "var(--sleep)",
  discomfort: "var(--amber)",
  pain: "var(--alert)",
  other: "var(--ink-3)",
};

function causeColor(label: string): string {
  return CAUSE_ACCENT[label.toLowerCase()] ?? "var(--primary)";
}

// "2m" / "45s" between onset and end of a finished episode.
function episodeDuration(ep: CryHistoryItem): string | undefined {
  if (!ep.endedAt) return undefined;
  const seconds = Math.max(0, Math.round((new Date(ep.endedAt).getTime() - new Date(ep.at).getTime()) / 1000));
  return seconds < 60 ? `${seconds}s` : `${Math.round(seconds / 60)}m`;
}

// Ranked horizontal progress bar for a single likely cause.
function CauseRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-[88px] shrink-0 text-[12.5px] font-medium capitalize text-ink-2">{label}</span>
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
  const { episodes } = useCryHistory(session, babyId);
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

      {/* Recent episodes — the per-episode timeline (DESIGN.md §3 variant C):
          a parent who missed the live alert sees when it happened, the likely
          cause, and how long it lasted (or that it's still ongoing). */}
      {episodes.length > 0 && (
        <section>
          <p className="label mb-[10px]">Recent episodes</p>
          <div className="rounded-card border border-line bg-surface">
            {episodes.slice(0, 8).map((ep) => (
              <TimelineRow
                key={ep.episodeId}
                icon={<span className="text-[13px]">😢</span>}
                title={ep.cryType ? ep.cryType.charAt(0).toUpperCase() + ep.cryType.slice(1) : "Cry"}
                tag={ep.state === "crying" ? "ongoing" : episodeDuration(ep)}
                time={formatRelativeTime(ep.at)}
                chipBg={ep.state === "crying" ? "bg-alert-soft text-alert" : "bg-surface-2 text-ink-3"}
              />
            ))}
          </div>
        </section>
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
