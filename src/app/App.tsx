import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetry } from "../api/get-json";
import type { Session } from "../session/session";
import type { LiveSync } from "../realtime/live-sync";
import { BrandProvider } from "../brand/BrandProvider";
import { AuthGate } from "../auth/AuthGate";
import { AcceptInviteScreen } from "../auth/AcceptInviteScreen";
import { AppShell } from "../shell/AppShell";
import { SimulatorApp } from "../simulator/SimulatorApp";

export function App({
  session,
  baseUrl,
  inviteToken,
  liveSync,
  simulatorMode = false,
}: {
  session: Session;
  baseUrl: string;
  inviteToken?: string;
  liveSync?: LiveSync;
  simulatorMode?: boolean;
}) {
  const [onboarding, setOnboarding] = useState(inviteToken !== undefined);
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider baseUrl={baseUrl}>
        {simulatorMode ? (
          // Standalone Device Simulator (?simulator=1). AuthGate provides the
          // user login the claim/pair steps need; everything else on the page
          // runs on its own device-token session.
          <AuthGate session={session}>
            <SimulatorApp session={session} baseUrl={baseUrl} />
          </AuthGate>
        ) : onboarding && inviteToken ? (
          <AcceptInviteScreen
            session={session}
            token={inviteToken}
            onAccepted={() => setOnboarding(false)}
            onBackToLogin={() => setOnboarding(false)}
          />
        ) : (
          <AuthGate session={session}>
            <AppShell session={session} baseUrl={baseUrl} liveSync={liveSync} />
          </AuthGate>
        )}
      </BrandProvider>
    </QueryClientProvider>
  );
}
