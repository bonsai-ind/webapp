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

// The user-scoped Live-sync stream (cry alerts + cache updates). Connects only
// while authenticated — start on auth, stop on logout; the bearer is pulled fresh
// on every (re)connect.
const liveSync = createLiveSync({
  url: `${baseUrl}/live`,
  getToken: () => session.getAccessToken() ?? "",
  factory: createFetchStreamFactory(),
});
session.onAuthChange((state) =>
  state.status === "authenticated" ? liveSync.start() : liveSync.stop(),
);

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
      <App session={session} baseUrl={baseUrl} inviteToken={inviteToken} liveSync={liveSync} />
    </StrictMode>,
  );
});
