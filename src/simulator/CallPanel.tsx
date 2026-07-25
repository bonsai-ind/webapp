import { Panel } from "./Panel";
import { StatusPill } from "../ui/StatusPill";
import { primaryButtonClass, secondaryButtonClass } from "../ui/forms";
import type { CallPhase } from "./call-state";
import type { RefObject } from "react";

// The device end of a 1-to-1 call: live local-camera preview (what the viewer
// sees), the viewer's push-to-talk audio out, auto-answer, and the
// device-initiated "Call caregiver" ring.
export function CallPanel({
  phase,
  mediaError,
  autoAnswer,
  onAutoAnswerChange,
  localVideoRef,
  remoteAudioRef,
  remoteVideoRef,
  hasRemoteVideo = false,
  onAnswer,
  onHangUp,
  onCallCaregiver,
}: {
  phase: CallPhase;
  mediaError: boolean;
  autoAnswer: boolean;
  onAutoAnswerChange: (on: boolean) => void;
  localVideoRef: RefObject<HTMLVideoElement | null>;
  remoteAudioRef: RefObject<HTMLAudioElement | null>;
  // Two-way video: the parent's camera feed — what the baby sees.
  remoteVideoRef?: RefObject<HTMLVideoElement | null>;
  hasRemoteVideo?: boolean;
  onAnswer: () => void;
  onHangUp: () => void;
  onCallCaregiver: () => Promise<void>;
}) {
  const inCall = phase === "ringing" || phase === "live";
  const showParent = phase === "live" && hasRemoteVideo;

  return (
    <Panel title="Video call">
      <div className="flex items-center justify-between">
        <StatusPill
          tone={phase === "live" ? "calm" : phase === "ringing" ? "fussing" : "neutral"}
          label={phase === "live" ? "In call" : phase === "ringing" ? "Waiting for viewer…" : "Idle"}
        />
        <label className="flex items-center gap-2 text-[12.5px] font-semibold text-ink-2">
          Auto-answer
          <input
            type="checkbox"
            checked={autoAnswer}
            onChange={(e) => onAutoAnswerChange(e.target.checked)}
            className="size-5 accent-(--primary)"
          />
        </label>
      </div>

      {/* The "device screen": the parent's feed fills it during a live two-way
          call (that's what the baby sees), with our own camera shrunk to a PiP.
          Outside that, our camera preview is the main surface. Both <video>s
          stay mounted so the refs exist before tracks attach. */}
      <div className="relative aspect-video overflow-hidden rounded-[14px] bg-[#101017]">
        {remoteVideoRef && (
          <video
            ref={remoteVideoRef}
            playsInline
            autoPlay
            data-testid="parent-video"
            className={`size-full object-cover ${showParent ? "" : "hidden"}`}
          />
        )}
        <video
          ref={localVideoRef}
          muted
          playsInline
          autoPlay
          data-testid="device-camera"
          className={
            showParent
              ? "absolute right-2 top-2 z-10 aspect-video w-24 rounded-[8px] border border-white/25 object-cover"
              : "size-full object-cover"
          }
        />
        {!inCall && (
          <span className="absolute inset-0 grid place-items-center text-[12.5px] text-white/50">
            Camera preview appears during a call
          </span>
        )}
        {phase === "live" && !hasRemoteVideo && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/50 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.13em] text-white/70">
            Parent camera is off
          </span>
        )}
      </div>
      <audio ref={remoteAudioRef} autoPlay />

      {mediaError && (
        <p className="text-[12px] font-medium text-amber">
          Camera/mic unavailable — allow permissions, and note getUserMedia needs localhost or HTTPS.
        </p>
      )}

      {inCall ? (
        <button
          type="button"
          onClick={onHangUp}
          className="h-12 rounded-[14px] bg-alert font-semibold text-white transition-opacity hover:opacity-95"
        >
          Hang up
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className={secondaryButtonClass} onClick={onAnswer}>
            Join call room
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => void onCallCaregiver()}>
            Call caregiver
          </button>
        </div>
      )}
    </Panel>
  );
}
