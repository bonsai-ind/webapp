# 11 · PWA install + push + cry dedup — AFK

## Parent
`docs/prd/0001-companion-app-foundation.md`

## What to build
The core product promise: a cry wakes a locked phone, exactly once (ADR-0002, ADR-0004). Onboarding guides the parent to **install the PWA to the home screen** and **grant notification permission** — a hard-to-skip step, because on iOS background push requires the installed PWA. The service worker receives **Web Push** for a cry and shows an OS notification. The same cry also arrives over Live-sync when the app is open. The client **dedups by cry-episode id** (the service-worker notification `tag` = episode id), so an open app and a locked phone never double-alert. A cry on a device the user isn't currently viewing still alerts (all-device visibility). Web Push *delivery* is environment-dependent and not E2E-tested; the **dedup and routing logic are unit-tested** at the realtime-transport seam.

## Acceptance criteria
- [~] Onboarding prompts install + notification permission and clearly states background alerts need it (especially iOS) _(`<EnablePushCard>` (`src/push/EnablePushCard.tsx`) is built + TDD'd + wired into the Today screen (shown until notifications are granted): "Never miss a cry → Enable cry alerts" calls `enablePushNotifications`, and the `unsupported` branch shows "Add Hush to your home screen" (iOS) guidance. Verified in-browser. A native `beforeinstallprompt` hook isn't wired — just the copy)_
- [~] A Web Push cry produces an OS notification via the service worker _(`public/sw.js` `push` handler builds the notification (shape mirrors the TDD'd `buildCryNotification`) and calls `showNotification`; the SW is registered + activated (verified in-browser). Live delivery needs a push server; the SW handler itself isn't unit-tested (SW context))_
- [~] An open app receiving the same cry over Live-sync renders the in-app treatment and the duplicate push is collapsed by episode-id tag (one alert per episode) _(the dedup key is wired both sides — `buildCryNotification.tag = episodeId` (SW) and Live-sync `dedupeKey` (in-app); the browser collapses same-tag notifications. The in-app *treatment* is the cry-alert variant, slice 12)_
- [x] A cry on a non-viewed device still alerts the user _(`<CryAlertOverlay>`'s `useCryStatus` subscribes to `cry-status` on the user-scoped `/live` stream — not filtered by the active tab/baby — so a cry on any of the user's babies raises the full-screen alert. Wired into `<App>`; TDD'd via fake transport)_
- [~] Dedup is unit-tested with both orderings (push-first and SSE-first) at the transport seam _(within-stream episode-id dedup TDD'd via `dedupeKey` in `live-sync.ts`; `buildCryNotification`'s episode tag TDD'd. The full cross-channel push↔SSE collapse is browser tag-behavior, exercised once both channels run live)_
- [x] A user who declines permission gets a clear, recoverable explanation rather than silent failure _(`<EnablePushCard>` shows a recoverable note on `denied` ("Notifications are blocked … turn them on … then try again") and keeps the retry button — TDD'd + wired into Today)_

## Progress
The PWA/push layer is now built: **manifest + service worker** (`public/manifest.webmanifest`, `public/sw.js`) registered in `main.tsx` — verified in the built app (manifest loads, SW reaches `activated`). The **logic core is TDD'd**: `buildCryNotification` (`src/push/cry-notification.ts`) maps a push payload to `{ title, body, tag: episodeId }` (the cross-channel dedup tag); `enablePushNotifications` (`src/push/enable-push.ts`) handles permission → `pushManager.subscribe` → `POST /push/subscriptions`, returning `enabled`/`denied`/`unsupported` (tested with stubbed `Notification`/`serviceWorker` + MSW).

The **enable-alerts UI** is now built + wired: `<EnablePushCard>` (`src/push/EnablePushCard.tsx`, TDD'd — enabled/denied/unsupported reactions, capability injected for testability) appears on the Today screen until notifications are granted.

Remaining (gated on backend): the `POST /push/subscriptions` endpoint and a push *sender* don't exist in `API.md` yet; the **VAPID key** needs wiring (`VITE_VAPID_PUBLIC_KEY`) and the base64→`Uint8Array` `applicationServerKey` conversion for real browsers; the in-app cry-alert treatment is slice 12. The `sw.js` notification shape **mirrors** `buildCryNotification` and must be kept in sync (the SW can't import the bundled module).

## Blocked by
- 06 · App shell & navigation
- 09 · Live-sync stream + echo-only writes
