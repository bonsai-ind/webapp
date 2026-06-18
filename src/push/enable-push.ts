import type { Session } from "../session/session";
import { getJson } from "../api/get-json";
import { urlBase64ToUint8Array } from "./vapid";

export type PushResult = "enabled" | "denied" | "unsupported";

/**
 * Ask for notification permission and, if granted, subscribe to Web Push and
 * register the subscription with the server. Safe to call when push is
 * unsupported or denied — returns a status instead of throwing, so onboarding
 * can explain the situation (iOS requires the PWA be installed first).
 */
export async function enablePushNotifications(session: Session): Promise<PushResult> {
  if (!("Notification" in globalThis) || !("serviceWorker" in navigator) || !("PushManager" in globalThis)) {
    return "unsupported";
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const { key } = await getJson<{ key: string }>(session, "/push/vapid-public-key");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });

  await session.authedFetch("/push/subscriptions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });

  return "enabled";
}
