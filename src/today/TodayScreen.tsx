import type { Session } from "../session/session";
import type { LiveSync } from "../realtime/live-sync";
import { useCryStatus } from "../cries/useCryStatus";
import { StatTile } from "../ui/StatTile";
import { EnablePushCard } from "../push/EnablePushCard";
import { ListeningCard } from "./ListeningCard";
import { useTodaySummary } from "./useTodaySummary";

const NOOP_LIVE_SYNC: LiveSync = {
  start() {},
  stop() {},
  on() { return () => {}; },
};

function shouldPromptPush(): boolean {
  return typeof Notification !== "undefined" && Notification.permission !== "granted";
}

export function TodayScreen({
  session,
  babyId,
  liveSync,
  onOpenMonitor,
}: {
  session: Session;
  babyId?: string;
  liveSync?: LiveSync;
  onOpenMonitor?: () => void;
}) {
  const { summary } = useTodaySummary(session, babyId);
  const cryStatus = useCryStatus(liveSync ?? NOOP_LIVE_SYNC);

  return (
    <div className="flex flex-col gap-[18px]">
      <ListeningCard status={cryStatus} onOpenMonitor={onOpenMonitor ?? (() => {})} />

      {shouldPromptPush() && <EnablePushCard session={session} />}

      <div className="grid grid-cols-3 gap-3">
        <StatTile label="Sleep" value={summary?.sleep ?? "—"} accent="sleep" />
        <StatTile label="Cry episodes" value={summary?.cryEpisodes ?? "—"} accent="alert" />
        <StatTile label="Feeds" value={summary?.feeds ?? "—"} accent="feed" />
      </div>
    </div>
  );
}
