import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { shouldRetry } from "../api/get-json";
import type { Session } from "../session/session";
import type { LiveSync } from "../realtime/live-sync";
import { BrandProvider } from "../brand/BrandProvider";
import { AuthGate } from "../auth/AuthGate";
import { AcceptInviteScreen } from "../auth/AcceptInviteScreen";
import { AppShell } from "../shell/AppShell";
import { CryAlertOverlay } from "../cries/CryAlertOverlay";

export function App({
  session,
  baseUrl,
  inviteToken,
  liveSync,
}: {
  session: Session;
  baseUrl: string;
  inviteToken?: string;
  liveSync?: LiveSync;
}) {
  const [onboarding, setOnboarding] = useState(inviteToken !== undefined);
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: shouldRetry } } }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrandProvider baseUrl={baseUrl}>
        {onboarding && inviteToken ? (
          <AcceptInviteScreen
            session={session}
            token={inviteToken}
            onAccepted={() => setOnboarding(false)}
            onBackToLogin={() => setOnboarding(false)}
          />
        ) : (
          <AuthGate session={session}>
            <AppShell session={session} baseUrl={baseUrl} liveSync={liveSync} />
            {liveSync && <CryAlertOverlay liveSync={liveSync} />}
          </AuthGate>
        )}
      </BrandProvider>
    </QueryClientProvider>
  );
}
