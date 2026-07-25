import { useCallback, useEffect, useRef, useState } from "react";
import { startCall, type Call, type PeerConnection, type SignalingChannel } from "../video/start-call";
import { createSignalingChannel } from "../video/signaling";
import type { DeviceSession } from "./device-session";
import { fetchDeviceTurnConfig, requestCall } from "./device-api";
import { transition, type CallPhase } from "./call-state";

const RING_TIMEOUT_MS = 60_000;

/**
 * The camera-peer mirror of src/video/useCall.ts (ADR 0013): the simulator IS
 * the device, so it answers — device TURN → RTCPeerConnection → real
 * getUserMedia (camera + mic) → signaling with the DEVICE token (dual-key
 * route, authorized because device_id == room) → startCall role:"callee" →
 * `ready`. The viewer offers; we answer. Protocol rules live in call-state.ts;
 * this hook is the browser-only glue (untested by unit, like useCall).
 */
export function useDeviceCall({
  deviceSession,
  baseUrl,
  deviceId,
  autoAnswer,
}: {
  deviceSession: DeviceSession;
  baseUrl: string;
  deviceId?: string;
  autoAnswer: boolean;
}) {
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [mediaError, setMediaError] = useState(false);
  // Two-way video: the parent's camera feed, shown on the "device screen".
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const phaseRef = useRef<CallPhase>("idle");
  const autoAnswerRef = useRef(autoAnswer);
  autoAnswerRef.current = autoAnswer;

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const callRef = useRef<Call | null>(null);
  const signalingRef = useRef<SignalingChannel | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const ringTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setCallPhase = (next: CallPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const teardown = useCallback(() => {
    if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
    ringTimerRef.current = null;
    callRef.current?.hangUp();
    callRef.current = null;
    signalingRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setHasRemoteVideo(false);
    pcRef.current?.close();
    pcRef.current = null;
  }, []);

  // Run one call-state event: update the phase and perform the effects the
  // transition asks for. All entry points funnel through here.
  const dispatch = useCallback(
    (event: Parameters<typeof transition>[1]) => {
      const t = transition(phaseRef.current, event, { autoAnswer: autoAnswerRef.current });
      if (t.teardown) teardown();
      if (t.resendReady) signalingRef.current?.send({ kind: "ready" });
      setCallPhase(t.phase);
      if (t.answer) void answer();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teardown],
  );

  async function answer(): Promise<void> {
    if (!deviceId) return;
    setMediaError(false);
    try {
      const config = await fetchDeviceTurnConfig(deviceSession);

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        // No camera/mic permission (or non-secure context) — surface it and idle.
        setMediaError(true);
        setCallPhase("idle");
        return;
      }
      streamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection(config);
      pcRef.current = pc;
      for (const track of stream.getTracks()) pc.addTrack(track, stream);
      pc.ontrack = (e) => {
        // The viewer attaches its tracks via replaceTrack on bare transceivers,
        // so e.streams is EMPTY (no msid on the wire) — synthesize a stream per
        // track or srcObject never gets set and the media silently drops.
        const stream = e.streams[0] ?? new MediaStream([e.track]);
        // The viewer's push-to-talk audio.
        if (e.track.kind === "audio" && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = stream;
        }
        // The parent's camera (two-way video). The track mutes when the parent
        // toggles their camera off (replaceTrack(null) stops the RTP flow), so
        // the UI falls back to the "camera off" state and returns on unmute.
        if (e.track.kind === "video") {
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
          setHasRemoteVideo(!e.track.muted);
          e.track.onunmute = () => setHasRemoteVideo(true);
          e.track.onmute = () => setHasRemoteVideo(false);
          e.track.onended = () => setHasRemoteVideo(false);
        }
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          if (ringTimerRef.current) clearTimeout(ringTimerRef.current);
          dispatch("connected");
        } else if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
          dispatch("disconnected");
        }
      };

      const signaling = createSignalingChannel({
        session: deviceSession,
        baseUrl,
        deviceId,
        // Announce the camera peer only once the down-stream is joined (the hub
        // doesn't buffer): a `ready` sent before we're in the room invites an
        // offer we would never receive.
        onOpen: () => signaling.send({ kind: "ready" }),
      });
      signalingRef.current = signaling;
      // Intercept the viewer's camera-state announcements (replaceTrack(null)
      // stops RTP without reliably muting the remote track, so the viewer says
      // it explicitly); everything else flows to the handshake orchestrator.
      const intercepted: SignalingChannel = {
        send: (s) => signaling.send(s),
        onMessage: (handler) =>
          signaling.onMessage((sig) => {
            if (sig.kind === "camera-on") setHasRemoteVideo(true);
            else if (sig.kind === "camera-off") setHasRemoteVideo(false);
            else handler(sig);
          }),
      };
      callRef.current = startCall({ pc: pc as unknown as PeerConnection, signaling: intercepted, role: "callee" });

      ringTimerRef.current = setTimeout(() => dispatch("timeout"), RING_TIMEOUT_MS);
    } catch {
      teardown();
      setCallPhase("idle");
    }
  }

  const handleIncomingCall = useCallback(() => dispatch("incoming-call"), [dispatch]);
  const answerNow = useCallback(() => dispatch("start"), [dispatch]);
  const hangUp = useCallback(() => dispatch("hangup"), [dispatch]);

  // Device-initiated call: ring every member of this device, then join the
  // room and wait for a viewer to accept and offer. An optional reason marks an
  // automatic escalation (e.g. a face-covered distress emergency auto-ringing).
  const callCaregiver = useCallback(
    async (reason?: string) => {
      await requestCall(deviceSession, `call_sim_${crypto.randomUUID()}`, reason);
      dispatch("start");
    },
    [deviceSession, dispatch],
  );

  // Teardown on unmount only.
  useEffect(() => teardown, [teardown]);

  return {
    phase,
    mediaError,
    hasRemoteVideo,
    localVideoRef,
    remoteAudioRef,
    remoteVideoRef,
    handleIncomingCall,
    answerNow,
    hangUp,
    callCaregiver,
  };
}
