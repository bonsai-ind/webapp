import { forwardRef } from "react";

export type CallStatus = "connecting" | "live" | "ended";

// DESIGN.md screen 2 (Live Monitor): full-bleed dark night-vision feed, glass
// LIVE pill, bottom Hold-to-talk. Presentational — the WebRTC lifecycle lives in
// useCall; the remote MediaStream is attached to the forwarded <video> ref.
export const MonitorView = forwardRef<HTMLVideoElement, {
  status: CallStatus;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}>(function MonitorView({ status, onHoldStart, onHoldEnd }, videoRef) {
  return (
    <div className="relative flex min-h-[60vh] flex-col overflow-hidden rounded-card bg-[#0B0C12] text-white">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 size-full object-cover" />

      <div className="relative flex items-center gap-2 p-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] backdrop-blur">
          {status === "live" ? (
            <>
              <span className="size-1.5 rounded-full bg-alert" aria-hidden="true" />
              LIVE
            </>
          ) : status === "connecting" ? (
            "Connecting…"
          ) : (
            "Ended"
          )}
        </span>
      </div>

      <div className="relative mt-auto flex justify-center p-4">
        <button
          type="button"
          onPointerDown={onHoldStart}
          onPointerUp={onHoldEnd}
          onPointerLeave={onHoldEnd}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-white"
        >
          Hold to talk
        </button>
      </div>
    </div>
  );
});
