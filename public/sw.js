/* Hush service worker — Web Push only.
 *
 * The cry-notification shape below MIRRORS src/push/cry-notification.ts
 * (buildCryNotification) — keep them in sync. It can't import the bundled module
 * because the SW is a separate, un-bundled context. The `tag` = cry-episode id is
 * the cross-channel dedup key (ADR-0004): same episode over push + in-app collapses
 * to one notification. */

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = `${payload.babyName || "Your baby"} is crying`;
  const body = payload.cause ? `Likely cause: ${payload.cause}` : "Tap to open the live monitor.";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: payload.episodeId,
      data: payload,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const open = clients.find((c) => "focus" in c);
      return open ? open.focus() : self.clients.openWindow("/");
    }),
  );
});
