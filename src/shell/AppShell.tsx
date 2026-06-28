import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import type { LiveSync } from "../realtime/live-sync";
import { useCryStatus } from "../cries/useCryStatus";
import { CryAlertOverlay } from "../cries/CryAlertOverlay";
import { useUnreadCount } from "../notifications/useNotifications";
import { NotificationsOverlay } from "../notifications/NotificationsOverlay";
import { useBabies } from "../babies/useBabies";
import { useOrgs } from "../auth/useOrgs";
import { SwitchOrgMenu } from "../auth/SwitchOrgMenu";
import { TodayScreen } from "../today/TodayScreen";
import { CriesScreen } from "../cries/CriesScreen";
import { GrowthScreen } from "../growth/GrowthScreen";
import { MonitorScreen } from "../video/MonitorScreen";
import { SleepScreen } from "../sleep/SleepScreen";
import { FeedingScreen } from "../feeding/FeedingScreen";
import { AppHeader } from "./AppHeader";

const NOOP_LIVE_SYNC: LiveSync = {
  start() {},
  stop() {},
  on() { return () => {}; },
};

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Good morning";
  if (h >= 12 && h < 17) return "Good afternoon";
  if (h >= 17 && h < 22) return "Good evening";
  return "Good night";
}

const TABS = ["Today", "Monitor", "Cries", "Growth"] as const;
type Tab = (typeof TABS)[number];
type SubScreen = "sleep" | "feeding" | null;

export function AppShell({
  session,
  baseUrl,
  liveSync,
}: {
  session: Session;
  baseUrl: string;
  liveSync?: LiveSync;
}) {
  const [active, setActive] = useState<Tab>("Today");
  const [subscreen, setSubscreen] = useState<SubScreen>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedBabyId, setSelectedBabyId] = useState<string>();
  const { babies } = useBabies(session);
  const { orgs } = useOrgs(session);
  const queryClient = useQueryClient();
  const activeBaby = babies.find((b) => b.id === selectedBabyId) ?? babies[0];

  // Wire the header StatusPill to the live cry status (falls back to "calm"
  // when no liveSync is connected — e.g. in tests).
  const cryStatus = useCryStatus(liveSync ?? NOOP_LIVE_SYNC);

  // Bell badge (ADR 0014). The live `notification` event refreshes the badge +
  // history; refetch-on-focus (global) self-heals a missed event.
  const { unread } = useUnreadCount(session);
  useEffect(() => {
    if (!liveSync) return;
    return liveSync.on("notification", () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  }, [liveSync, queryClient]);

  // Navigate to the Live Monitor for a specific baby (used by the cry alert's
  // Open/Talk and the open-monitor notification action). Switches the active baby
  // so MonitorScreen resolves that baby's device + call.
  const goToMonitor = (babyId?: string) => {
    if (babyId) setSelectedBabyId(babyId);
    setActive("Monitor");
    setSubscreen(null);
  };

  // Interpret a notification's opaque action: navigate to a known destination,
  // ignore unknown kinds gracefully.
  const handleNotificationAction = (action: unknown) => {
    const a = action as { kind?: string; babyId?: string } | null;
    if (a?.kind === "open-cries") {
      if (a.babyId) setSelectedBabyId(a.babyId);
      setActive("Cries");
      setSubscreen(null);
    } else if (a?.kind === "open-monitor") {
      goToMonitor(a.babyId);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        greeting={greeting()}
        babyName={activeBaby?.name}
        avatarUrl={activeBaby?.avatarUrl}
        babies={babies}
        onSelectBaby={setSelectedBabyId}
        status={cryStatus.status}
        unreadCount={unread}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onSignOut={() => void session.logout()}
      />
      {orgs.length > 1 && (
        <div className="px-[18px] pb-2">
          <SwitchOrgMenu
            orgs={orgs}
            session={session}
            onSwitched={() => queryClient.invalidateQueries()}
          />
        </div>
      )}
      <main
        role="tabpanel"
        aria-labelledby={`tab-${active}`}
        className="flex flex-1 flex-col gap-[18px] px-[18px] pt-2"
      >
        {subscreen !== null && (
          <button onClick={() => setSubscreen(null)} className="flex items-center gap-1 text-[13px] font-semibold text-primary mb-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Today
          </button>
        )}
        <h1 className="text-[25px] font-extrabold tracking-[-0.03em] text-ink">
          {subscreen === "sleep" ? "Sleep" : subscreen === "feeding" ? "Feeding" : active}
        </h1>
        {active === "Today" && subscreen === null && (
          <TodayScreen
            session={session}
            babyId={activeBaby?.id}
            liveSync={liveSync}
            onOpenMonitor={() => setActive("Monitor")}
            onOpenSleep={() => setSubscreen("sleep")}
            onOpenFeeding={() => setSubscreen("feeding")}
          />
        )}
        {active === "Today" && subscreen === "sleep" && (
          <SleepScreen session={session} babyId={activeBaby?.id} />
        )}
        {active === "Today" && subscreen === "feeding" && (
          <FeedingScreen session={session} babyId={activeBaby?.id} />
        )}
        {active === "Monitor" && (
          <MonitorScreen session={session} baseUrl={baseUrl} babyId={activeBaby?.id} />
        )}
        {active === "Cries" && <CriesScreen session={session} babyId={activeBaby?.id} />}
        {active === "Growth" && <GrowthScreen session={session} babyId={activeBaby?.id} />}
      </main>

      <nav
        role="tablist"
        className="sticky bottom-0 flex border-t border-line bg-white/[0.86] pb-[env(safe-area-inset-bottom)] backdrop-blur-[18px] backdrop-saturate-150"
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            role="tab"
            id={`tab-${tab}`}
            aria-selected={tab === active}
            onClick={() => { setActive(tab); setSubscreen(null); }}
            className={`flex-1 py-3 font-mono text-[9px] font-medium uppercase tracking-[0.1em] transition-colors ${
              tab === active ? "text-primary" : "text-ink-3"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>

      {notificationsOpen && (
        <div className="fixed inset-0 z-20 flex flex-col bg-bg pt-[env(safe-area-inset-top)]">
          <NotificationsOverlay
            session={session}
            onClose={() => setNotificationsOpen(false)}
            onAction={handleNotificationAction}
          />
        </div>
      )}

      {/* Full-screen cry takeover + live-sync cache mirroring (ADR 0014). Lives
          here so Open/Talk can reach navigation. */}
      {liveSync && (
        <CryAlertOverlay liveSync={liveSync} onOpenMonitor={goToMonitor} onTalk={goToMonitor} />
      )}
    </div>
  );
}
