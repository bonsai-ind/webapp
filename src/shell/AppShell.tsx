import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session } from "../session/session";
import { useBabies } from "../babies/useBabies";
import { useOrgs } from "../auth/useOrgs";
import { SwitchOrgMenu } from "../auth/SwitchOrgMenu";
import { TodayScreen } from "../today/TodayScreen";
import { CriesScreen } from "../cries/CriesScreen";
import { GrowthScreen } from "../growth/GrowthScreen";
import { MonitorScreen } from "../video/MonitorScreen";
import { AppHeader } from "./AppHeader";

const TABS = ["Today", "Monitor", "Cries", "Growth"] as const;
type Tab = (typeof TABS)[number];

export function AppShell({ session, baseUrl }: { session: Session; baseUrl: string }) {
  const [active, setActive] = useState<Tab>("Today");
  const [selectedBabyId, setSelectedBabyId] = useState<string>();
  const { babies } = useBabies(session);
  const { orgs } = useOrgs(session);
  const queryClient = useQueryClient();
  const activeBaby = babies.find((b) => b.id === selectedBabyId) ?? babies[0];

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        babyName={activeBaby?.name}
        babies={babies}
        onSelectBaby={setSelectedBabyId}
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
      <main role="tabpanel" aria-labelledby={`tab-${active}`} className="flex flex-1 flex-col gap-[18px] px-[18px] pt-2">
        <h1 className="text-[25px] font-extrabold tracking-[-0.03em] text-ink">{active}</h1>
        {active === "Today" && <TodayScreen session={session} babyId={activeBaby?.id} />}
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
            onClick={() => setActive(tab)}
            className={`flex-1 py-3 font-mono text-[9px] font-medium uppercase tracking-[0.1em] transition-colors ${
              tab === active ? "text-primary" : "text-ink-3"
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
