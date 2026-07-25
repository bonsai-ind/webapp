import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { createSession } from "./session/session";
import { createLiveSync } from "./realtime/live-sync";
import { createFetchStreamFactory } from "./realtime/fetch-stream-factory";
import { App } from "./app/App";

// API base: same-origin in prod (api.<domain> via env), localhost in dev.
const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

// Register the service worker (Web Push + installability). Best-effort; the app
// works without it (foreground only).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

const session = createSession({ baseUrl });

// ?simulator=1 turns this page into the standalone Device Simulator: the page
// acts as a device (its own device-token session), so the user-scoped
// Live-sync stream is not started — a device is not a caregiver client.
const simulatorMode = new URLSearchParams(window.location.search).has("simulator");

// The user-scoped Live-sync stream (cry alerts + cache updates). Connects only
// while authenticated — start on auth, stop on logout; the bearer is pulled fresh
// on every (re)connect.
const liveSync = createLiveSync({
  url: `${baseUrl}/live`,
  getToken: () => session.getAccessToken() ?? "",
  factory: createFetchStreamFactory(),
  // Replay guard (ADR-0004): a Last-Event-ID replay after reconnect must not
  // re-fire a safety alert or re-ring a call the user already saw.
  dedupeKey: (event) => {
    const d = event.data as { episodeId?: string; state?: string; callId?: string } | null;
    if (
      (event.type === "cry-status" || event.type === "safety-status" || event.type === "temperature-status") &&
      d?.episodeId &&
      d?.state
    ) {
      return `${event.type}:${d.episodeId}:${d.state}`;
    }
    if (event.type === "call-request" && d?.callId) return `call-request:${d.callId}`;
    return undefined; // cache frames may repeat freely
  },
  onAuthError: async () => {
    try {
      await session.refreshToken()
    } catch {
      void session.logout()
      liveSync.stop()
    }
  },
});
if (!simulatorMode) {
  session.onAuthChange((state) =>
    state.status === "authenticated" ? liveSync.start() : liveSync.stop(),
  );
}

// A `revoked` control event means the server has revoked this session mid-stream
// (token family revoked, or the user was removed from the device). Log out
// immediately so the UI reaches the sign-in screen within seconds (Issue 10).
liveSync.on("revoked", () => void session.logout());

// An invite link carries ?token=… — present it as the accept-invite (create
// account) flow rather than the normal sign-in.
const inviteToken = new URLSearchParams(window.location.search).get("token") ?? undefined;

// Recover an existing session from the stored refresh token before first render
// (Session.restore emits `authenticated`, which starts Live-sync).
session.restore().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App
        session={session}
        baseUrl={baseUrl}
        inviteToken={inviteToken}
        liveSync={liveSync}
        simulatorMode={simulatorMode}
      />
    </StrictMode>,
  );
});
