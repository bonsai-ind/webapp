import { useEffect, useRef, useState } from "react";
import type { Session } from "../session/session";
import { startCall, type Call, type PeerConnection } from "./start-call";
import { createSignalingChannel } from "./signaling";
import { fetchTurnConfig } from "./turn";
import type { CallStatus } from "./MonitorView";

/**
 * Integration hook — drives a real 1-to-1 call: TURN config → RTCPeerConnection →
 * getUserMedia (audio for talk) → signaling over the device channel → startCall.
 * Browser-only (RTCPeerConnection / getUserMedia), so it is not unit-tested; the
 * call protocol it relies on is covered by start-call's tests. A no-op when there
 * is no device to call.
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<MediaStream>(null);

  useEffect(() => {
    if (!deviceId) return;
    let call: Call | undefined;
    let pc: RTCPeerConnection | undefined;
    let cancelled = false;

    (async () => {
      const config = await fetchTurnConfig(session);
      if (cancelled) return;
      pc = new RTCPeerConnection(config);
      pc.ontrack = (e) => {
        if (videoRef.current) videoRef.current.srcObject = e.streams[0];
      };
      pc.onconnectionstatechange = () => {
        if (pc?.connectionState === "connected") setStatus("live");
        else if (pc && ["failed", "closed", "disconnected"].includes(pc.connectionState)) setStatus("ended");
      };
      const local = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled) {
        local.getTracks().forEach((t) => t.stop());
        return;
      }
      localRef.current = local;
      // Talk is push-to-talk: tracks start muted, enabled only while held.
      local.getAudioTracks().forEach((t) => {
        t.enabled = false;
        pc!.addTrack(t, local);
      });
      const signaling = createSignalingChannel({ session, baseUrl, deviceId });
      call = startCall({ pc: pc as unknown as PeerConnection, signaling, role: "caller" });
    })().catch(() => {
      // TURN/getUserMedia/permission failure — surface as ended rather than throw.
      if (!cancelled) setStatus("ended");
    });

    return () => {
      cancelled = true;
      call?.hangUp();
      pc?.close();
      localRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [session, baseUrl, deviceId]);

  const setTalk = (on: boolean) =>
    localRef.current?.getAudioTracks().forEach((t) => {
      t.enabled = on;
    });

  return {
    status,
    videoRef,
    holdStart: () => setTalk(true),
    holdEnd: () => setTalk(false),
  };
}
