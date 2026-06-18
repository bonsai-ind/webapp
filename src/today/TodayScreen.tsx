import type { Session } from "../session/session";
import { StatTile } from "../ui/StatTile";
import { EnablePushCard } from "../push/EnablePushCard";
import { useTodaySummary } from "./useTodaySummary";

// Nudge to turn on cry alerts until notifications are granted.
function shouldPromptPush(): boolean {
  return typeof Notification !== "undefined" && Notification.permission !== "granted";
}

export function TodayScreen({ session, babyId }: { session: Session; babyId?: string }) {
  const { summary } = useTodaySummary(session, babyId);

  return (
    <div className="flex flex-col gap-[18px]">
      {shouldPromptPush() && <EnablePushCard session={session} />}
      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Sleep" value={summary?.sleep ?? "—"} accent="sleep" />
        <StatTile label="Cry episodes" value={summary?.cryEpisodes ?? "—"} accent="alert" />
        <StatTile label="Feeds" value={summary?.feeds ?? "—"} accent="feed" />
      </div>
    </div>
  );
}
