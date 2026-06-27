import type { RefObject } from "react";
import type { TalkState } from "./useCall";

export type CallStatus = "connecting" | "live" | "ended";

const TALK_LABEL: Record<TalkState, string> = {
  idle: "Hold to talk",
  activating: "Mic activating…",
  talking: "Talking…",
};

// DESIGN.md screen 2 (Live Monitor): full-bleed dark night-vision feed, glass
// LIVE pill, bottom Hold-to-talk. Presentational — the WebRTC lifecycle lives in
// useCall; the remote MediaStream is attached to the passed <video> ref (visual
// sink, muted) and a hidden non-muted <audio> ref (always plays, incl. audio-only
// calls). When hasVideo is false an "Audio only" placeholder replaces the feed.
export function MonitorView({
  status,
  talkState,
  hasVideo,
  micError,
  videoRef,
  audioRef,
  onHoldStart,
  onHoldEnd,
}: {
  status: CallStatus;
  talkState: TalkState;
  hasVideo: boolean;
  micError: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  return (
    <div className="relative flex min-h-[60vh] flex-col overflow-hidden rounded-card bg-[#0B0C12] text-white">
      {/* Visual sink — muted, so room audio plays through the hidden <audio> only. */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 size-full object-cover"
      />
      {/* Audio sink — never muted, so baby/room audio plays on audio-only calls. */}
      <audio ref={audioRef} autoPlay className="hidden" />

      {!hasVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.13em] text-white/55">
            Audio only
          </span>
        </div>
      )}

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

      {micError && (
        <div className="relative mx-4 rounded-card bg-alert/20 px-3 py-2 text-[12px] text-white">
          Microphone unavailable — check permissions.
        </div>
      )}

      <div className="relative mt-auto flex justify-center p-4">
        <button
          type="button"
          onPointerDown={onHoldStart}
          onPointerUp={onHoldEnd}
          onPointerLeave={onHoldEnd}
          className="rounded-full bg-primary px-6 py-3 font-semibold text-white"
        >
          {TALK_LABEL[talkState]}
        </button>
      </div>
    </div>
  );
}
