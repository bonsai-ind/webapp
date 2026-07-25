import { useEffect, useRef, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";

export interface CallRequest {
  callId: string;
  deviceId: string;
  deviceName: string;
  babyId?: string;
  babyName?: string;
}

const RING_WINDOW_MS = 60_000;

// Full-screen incoming-call takeover for a device-initiated call (`call-request`
// Live-sync frame). Deliberately NOT the safety red — a call is not a safety
// event (ADR 0005); it uses the primary brand surface instead. Accept jumps to
// the Live Monitor, whose normal call flow (wake + offer) connects to the
// already-waiting camera peer. The ring auto-dismisses when the device gives up.
export function IncomingCallOverlay({
  liveSync,
  onAccept,
}: {
  liveSync: LiveSync;
  onAccept: (babyId?: string) => void;
}) {
  const [ringing, setRinging] = useState<CallRequest | null>(null);
  // callIds already rung — guards a Last-Event-ID replay re-ringing a call.
  const seen = useRef(new Set<string>());

  useEffect(
    () =>
      liveSync.on("call-request", (data) => {
        const call = data as CallRequest | null;
        if (!call?.callId || seen.current.has(call.callId)) return;
        seen.current.add(call.callId);
        setRinging(call);
      }),
    [liveSync],
  );

  useEffect(() => {
    if (!ringing) return;
    const timer = setTimeout(() => setRinging(null), RING_WINDOW_MS);
    return () => clearTimeout(timer);
  }, [ringing]);

  if (!ringing) return null;

  return (
    <div
      role="alertdialog"
      aria-label={`${ringing.deviceName} is calling`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-primary to-primary-700 px-[18px] text-center text-white"
    >
      <h1 className="text-[31px] font-extrabold tracking-[-0.02em]">{ringing.deviceName} is calling</h1>
      {ringing.babyName && (
        <span className="rounded-full bg-white/15 px-3 py-1 font-mono text-[12px]">{ringing.babyName}</span>
      )}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <button
          type="button"
          onClick={() => {
            const babyId = ringing.babyId;
            setRinging(null);
            onAccept(babyId);
          }}
          className="h-12 rounded-[14px] bg-white font-semibold text-primary"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => setRinging(null)}
          className="h-12 rounded-[14px] border border-white/40 font-semibold text-white"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
