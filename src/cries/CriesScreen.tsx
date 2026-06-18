import type { Session } from "../session/session";
import { StatTile } from "../ui/StatTile";
import { Bars } from "../ui/Bars";
import { useCryPatterns } from "./useCryPatterns";
import { fussiestWindow } from "./fussiest-window";

export function CriesScreen({ session, babyId }: { session: Session; babyId?: string }) {
  const { patterns } = useCryPatterns(session, babyId);
  const peak = patterns ? fussiestWindow(patterns.hourly) : undefined;

  return (
    <div className="flex flex-col gap-[18px]">
      <StatTile label="Avg/day" value={patterns?.avgPerDay ?? "—"} accent="alert" />
      {peak && (
        <p className="text-[13.5px] text-ink-2">
          Fussiest around {String(peak.hour).padStart(2, "0")}:00
        </p>
      )}
      {patterns && (
        <Bars values={patterns.hourly} peakIndex={peak?.hour} accent="alert" label="Cries by hour" />
      )}
    </div>
  );
}
