import { useEffect, useRef, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";
import { useDistressStatus } from "./useDistressStatus";
import { distressAlertText, isAutoCall } from "./distress-status";
import { startAlertFeedback, type AlertFeedback } from "../cries/alert-feedback";

const SNOOZE_MS = 5 * 60_000;

/**
 * Behavioral-distress surfaces (the graded ladder):
 * - DANGER (distress / emergency): full-screen red takeover — an active safety
 *   event (ADR 0005), same visual class as a cry, with chirp+vibration. A
 *   covered-face emergency also shows that the caregivers are being auto-called.
 * - WARNING (stress): a non-blocking amber banner — needs attention, not a
 *   takeover.
 * Both clear automatically when the device posts the episode's clear.
 * (calm/fussing never reach the viewer — normal fussing is not surfaced.)
 */
export function DistressAlertOverlay({
  liveSync,
  onOpenMonitor,
}: {
  liveSync: LiveSync;
  onOpenMonitor?: (babyId?: string) => void;
}) {
  const alerts = useDistressStatus(liveSync);
  // Acknowledged episodes (episodeId → snooze expiry): Open/Dismiss hide the
  // takeover for 5 min so a still-active alert doesn't keep covering the Monitor
  // the user just navigated to. It re-nags if still open after.
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  const [, setTick] = useState(0);
  const now = Date.now();
  const danger =
    alerts.danger && (snoozedUntil[alerts.danger.id] ?? 0) <= now ? alerts.danger : undefined;

  // Re-evaluate when the active snooze lapses so the alert re-nags on time.
  useEffect(() => {
    const active = alerts.danger;
    if (!active) return;
    const expiry = snoozedUntil[active.id] ?? 0;
    if (expiry <= now) return;
    const timer = setTimeout(() => setTick((t) => t + 1), expiry - now + 50);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alerts.danger?.id, snoozedUntil]);

  const snooze = (episodeId: string) =>
    setSnoozedUntil((s) => ({ ...s, [episodeId]: Date.now() + SNOOZE_MS }));

  const feedbackRef = useRef<AlertFeedback | null>(null);
  useEffect(() => {
    if (danger && !feedbackRef.current) {
      feedbackRef.current = startAlertFeedback();
    } else if (!danger && feedbackRef.current) {
      feedbackRef.current.stop();
      feedbackRef.current = null;
    }
    return () => {
      feedbackRef.current?.stop();
      feedbackRef.current = null;
    };
  }, [danger]);

  if (danger) {
    const { title, hint, emoji } = distressAlertText(danger);
    return (
      <div
        role="alertdialog"
        aria-label={title}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-alert to-alert-2 px-[18px] text-center text-white"
      >
        <span className="font-mono text-[40px]" aria-hidden="true">
          {emoji}
        </span>
        <h1 className="text-[28px] font-extrabold tracking-[-0.02em]">{title}</h1>
        <p className="max-w-sm text-[14px] text-white/85">{hint}</p>
        {isAutoCall(danger) && (
          <p className="rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">Calling you now…</p>
        )}
        <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-[12px]">{danger.babyName}</span>
        <div className="flex w-full max-w-sm flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              // Acknowledge FIRST so the takeover doesn't keep covering the
              // Monitor screen it navigates to.
              snooze(danger.id);
              onOpenMonitor?.(danger.babyId);
            }}
            className="h-12 rounded-[14px] bg-white font-semibold text-alert-2"
          >
            Open live monitor
          </button>
          <button
            type="button"
            onClick={() => snooze(danger.id)}
            className="h-11 rounded-[14px] border border-white/40 bg-white/10 font-semibold text-white"
          >
            Dismiss for 5 min
          </button>
        </div>
      </div>
    );
  }

  if (alerts.warnings.length > 0) {
    const w = alerts.warnings[alerts.warnings.length - 1];
    const { title, hint } = distressAlertText(w);
    return (
      <div
        role="status"
        className="fixed inset-x-3 top-3 z-40 flex items-center gap-3 rounded-[14px] bg-amber-soft px-4 py-3 shadow-lg"
      >
        <span className="text-[16px]" aria-hidden="true">
          😖
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-amber">{title}</p>
          <p className="truncate text-[11.5px] text-ink-2">{hint}</p>
        </div>
      </div>
    );
  }

  return null;
}
