import type { Session } from "../session/session";
import { useBabyResource } from "../babies/useBabyResource";

interface ActiveAlert {
  episodeId: string;
  level: "stress" | "distress" | "emergency";
  cues: string[];
  since: string;
}
interface RecentEpisode {
  episodeId: string;
  level: string;
  cues: string[];
  state: string;
  at: string;
  endedAt?: string;
}
interface DistressData {
  activeAlerts: ActiveAlert[];
  recent: RecentEpisode[];
}

function levelTone(level: string): string {
  if (level === "distress" || level === "emergency") return "text-alert";
  if (level === "stress") return "text-amber";
  return "text-calm";
}

const cueList = (cues: string[]) => cues.map((c) => c.replace(/_/g, " ")).join(", ");

const clockTime = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// Today-screen behavioral card: the current distress level (tinted by severity)
// or a settled state, plus a short list of the day's recent episodes. Live: the
// `distress` cache frame invalidates ["distress", babyId]. Self-hides when the
// device has flagged nothing.
export function DistressCard({ session, babyId }: { session: Session; babyId?: string }) {
  const { data } = useBabyResource<DistressData>(session, babyId, "distress");
  if (!data || (data.activeAlerts.length === 0 && data.recent.length === 0)) return null;

  const active = data.activeAlerts[0];

  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-[18px]">
      <p className="label">Behavior</p>
      {active ? (
        <div>
          <p className={`text-[20px] font-extrabold capitalize ${levelTone(active.level)}`}>{active.level}</p>
          {active.cues.length > 0 && <p className="text-[12px] text-ink-2">{cueList(active.cues)}</p>}
        </div>
      ) : (
        <p className="text-[15px] font-semibold text-calm">Settled — no active alert</p>
      )}
      {data.recent.length > 0 && (
        <ul className="flex flex-col gap-1">
          {data.recent.slice(0, 4).map((e) => (
            <li key={e.episodeId} className="flex items-center justify-between text-[12px] text-ink-2">
              <span className={`font-semibold capitalize ${levelTone(e.level)}`}>{e.level}</span>
              <span className="font-mono text-ink-3">{clockTime(e.at)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[10.5px] text-ink-3">Posture + facial cues; normal fussing isn't flagged.</p>
    </section>
  );
}
