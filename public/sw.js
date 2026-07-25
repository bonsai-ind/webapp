/* Hush service worker — Web Push only.
 *
 * The cry-notification shape below MIRRORS src/push/cry-notification.ts
 * (buildCryNotification) — keep them in sync. It can't import the bundled module
 * because the SW is a separate, un-bundled context. The `tag` = cry-episode id is
 * the cross-channel dedup key (ADR-0004): same episode over push + in-app collapses
 * to one notification. */

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  // Non-cry alerts (e.g. temperature) carry their own title/body; the cry
  // rendering below stays the default.
  const title = payload.title || `${payload.babyName || "Your baby"} is crying`;
  const body = payload.body || (payload.cause ? `Likely cause: ${payload.cause}` : "Tap to open the live monitor.");
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.episodeId,
      data: payload,
      // A cry is time-critical (DESIGN.md): buzz, don't auto-dismiss, and
      // re-alert if the same tag is replaced by a newer frame.
      vibrate: [200, 100, 200],
      requireInteraction: true,
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const babyId = data.babyId;
  // Steer the deep-link by the push's kind (e.g. "open-emergency"); default to
  // the crying baby's Live Monitor.
  const kind = data.kind || "open-monitor";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => "focus" in c);
      if (open) {
        // Deep-link: the app shell listens for this and navigates accordingly.
        open.postMessage({ kind, babyId });
        return open.focus();
      }
      return self.clients.openWindow("/");
    }),
  );
});
