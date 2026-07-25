import { useEffect, useRef } from "react";
import type { LiveSync } from "../realtime/live-sync";
import { useSosAlert } from "./useSosAlert";
import { startAlertFeedback, type AlertFeedback } from "../cries/alert-feedback";

const KIND_TEXT: Record<string, string> = {
  ambulance: "is calling an ambulance",
  doctor: "is calling a doctor",
  other: "raised an SOS",
};

// Family alert: when a caregiver raises SOS, everyone on the baby's devices gets
// this red takeover so they know instantly. "Open emergency" jumps to the SOS
// screen. Reuses the cry/temperature chirp+vibration feedback.
export function EmergencySosOverlay({
  liveSync,
  onOpen,
}: {
  liveSync: LiveSync;
  onOpen: () => void;
}) {
  const { alert, dismiss } = useSosAlert(liveSync);

  const feedbackRef = useRef<AlertFeedback | null>(null);
  useEffect(() => {
    if (alert && !feedbackRef.current) {
      feedbackRef.current = startAlertFeedback();
    } else if (!alert && feedbackRef.current) {
      feedbackRef.current.stop();
      feedbackRef.current = null;
    }
    return () => {
      feedbackRef.current?.stop();
      feedbackRef.current = null;
    };
  }, [alert]);

  if (!alert) return null;

  return (
    <div
      role="alertdialog"
      aria-label="Emergency SOS raised"
      className="fixed inset-0 z-[65] flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-alert to-alert-2 px-[18px] text-center text-white"
    >
      <span className="font-mono text-[40px]" aria-hidden="true">
        🚨
      </span>
      <h1 className="text-[27px] font-extrabold tracking-[-0.02em]">Emergency — SOS raised</h1>
      <p className="max-w-sm text-[14px] text-white/85">
        A family member {KIND_TEXT[alert.kind]} for {alert.babyName}.
      </p>
      <div className="flex w-full max-w-sm flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            dismiss();
            onOpen();
          }}
          className="h-12 rounded-[14px] bg-white font-semibold text-alert-2"
        >
          Open emergency
        </button>
        <button
          type="button"
          onClick={dismiss}
          className="h-11 rounded-[14px] border border-white/40 bg-white/10 font-semibold text-white"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
