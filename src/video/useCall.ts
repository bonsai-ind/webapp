import { useEffect, useRef, useState } from "react";
import type { Session } from "../session/session";
import { startCall, type Call, type PeerConnection } from "./start-call";
import { createSignalingChannel } from "./signaling";
import { fetchTurnConfig } from "./turn";
import { wakeDevice } from "../devices/devices-api";
import type { CallStatus } from "./MonitorView";

export type TalkState = "idle" | "activating" | "talking";

/**
 * Integration hook — drives a real 1-to-1 call: TURN config → RTCPeerConnection
 * (pre-created audio sender for push-to-talk + recv-only video) → signaling over
 * the device channel → startCall → wake the device. The caller subscribes first
 * and defers its offer until the device announces `ready`, so a fast wake isn't
 * missed.
 *
 * True push-to-talk: the caregiver's mic is acquired ONLY while the talk button
 * is held (getUserMedia on holdStart → sender.replaceTrack) and fully released
 * on let-go (replaceTrack(null) + track.stop(), clearing the OS mic indicator).
 *
 * Browser-only (RTCPeerConnection / getUserMedia / MediaStreamTrack), so it is
 * not unit-tested; the call protocol it relies on is covered by start-call's
 * tests and the PTT race latch is verified manually / e2e. A no-op when there is
 * no device to call.
 */
export function useCall({
  session,
  baseUrl,
  deviceId,
}: {
  session: Session;
  baseUrl: string;
  deviceId?: string;
}) {
  const [status, setStatus] = useState<CallStatus>("connecting");
  const [talkState, setTalkState] = useState<TalkState>("idle");
  const [hasVideo, setHasVideo] = useState(false);
  const [micError, setMicError] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // The pre-created audio sender we swap the live mic track into for PTT.
  const senderRef = useRef<RTCRtpSender | null>(null);
  // The currently-held mic track, if any (so cleanup can stop it).
  const heldTrackRef = useRef<MediaStreamTrack | null>(null);
  // Monotonic hold sequence: each holdStart bumps it. A getUserMedia result is
  // only attached if its sequence still matches the latest hold — a release
  // (which bumps via holdEnd writing the "released" view) invalidates it.
  const holdSeqRef = useRef(0);
  // Set by the cleanup teardown; a resolving getUserMedia must never attach
  // after the hook has been torn down.
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!deviceId) return;
    cancelledRef.current = false;
    let call: Call | undefined;
    let pc: RTCPeerConnection | undefined;

    (async () => {
      const config = await fetchTurnConfig(session);
      if (cancelledRef.current) return;

      pc = new RTCPeerConnection(config);
      // Pre-create the transceivers up front so the offer is complete before the
      // device is woken: a sendrecv audio line we push the mic into for PTT, and
      // a recv-only video line for the monitor feed (caregiver sends no video).
      senderRef.current = pc.addTransceiver("audio", { direction: "sendrecv" }).sender;
      pc.addTransceiver("video", { direction: "recvonly" });

      pc.ontrack = (e) => {
        // Safe-mode: always route incoming media to the (non-muted) audio sink so
        // baby/room audio plays even on an audio-only call. A video track also
        // attaches to the visual sink and flips hasVideo.
        if (audioRef.current && e.streams[0]) audioRef.current.srcObject = e.streams[0];
        if (e.track.kind === "video") {
          if (videoRef.current && e.streams[0]) videoRef.current.srcObject = e.streams[0];
          setHasVideo(true);
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === "connected") setStatus("live");
        else if (pc && ["failed", "closed", "disconnected"].includes(pc.connectionState))
          setStatus("ended");
      };

      // Subscribe + arm the caller BEFORE waking the device, so a fast `ready`
      // frame (device already awake) isn't dropped before we're listening.
      const signaling = createSignalingChannel({ session, baseUrl, deviceId });
      call = startCall({ pc: pc as unknown as PeerConnection, signaling, role: "caller" });

      await wakeDevice(session, deviceId);
    })().catch(() => {
      // TURN fetch or wakeDevice failure — surface as ended rather than throw.
      if (!cancelledRef.current) setStatus("ended");
    });

    return () => {
      cancelledRef.current = true;
      // Invalidate any in-flight hold so a late getUserMedia stops its track.
      holdSeqRef.current += 1;
      call?.hangUp();
      heldTrackRef.current?.stop();
      heldTrackRef.current = null;
      senderRef.current?.replaceTrack(null);
      senderRef.current = null;
      pc?.close();
    };
  }, [session, baseUrl, deviceId]);

  // TRUE push-to-talk. holdStart acquires the mic; holdEnd releases it. The
  // monotonic holdSeq latch makes rapid hold/release safe: a release that lands
  // BEFORE getUserMedia resolves bumps the sequence, so the resolving track sees
  // a stale sequence, never attaches, and is stopped immediately — the mic is
  // never left stuck on.
  const holdStart = () => {
    const seq = (holdSeqRef.current += 1);
    setMicError(false);
    setTalkState("activating");
    void (async () => {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        // Only surface the error if this hold is still the active one.
        if (seq === holdSeqRef.current && !cancelledRef.current) {
          setMicError(true);
          setTalkState("idle");
        }
        return;
      }
      const track = stream.getAudioTracks()[0];
      // Stale (released or unmounted before we resolved) — drop it on the floor.
      if (seq !== holdSeqRef.current || cancelledRef.current || !senderRef.current) {
        track?.stop();
        return;
      }
      heldTrackRef.current = track;
      await senderRef.current.replaceTrack(track);
      // A release may have raced in during replaceTrack — re-check and undo.
      if (seq !== holdSeqRef.current || cancelledRef.current) {
        track.stop();
        heldTrackRef.current = null;
        void senderRef.current?.replaceTrack(null);
        return;
      }
      setTalkState("talking");
    })();
  };

  const holdEnd = () => {
    // Bump the sequence so any in-flight getUserMedia for the just-ended hold is
    // invalidated and won't attach.
    holdSeqRef.current += 1;
    setTalkState("idle");
    heldTrackRef.current?.stop(); // releases the device → OS mic indicator clears
    heldTrackRef.current = null;
    void senderRef.current?.replaceTrack(null);
  };

  return {
    status,
    talkState,
    hasVideo,
    micError,
    videoRef,
    audioRef,
    holdStart,
    holdEnd,
  };
}
