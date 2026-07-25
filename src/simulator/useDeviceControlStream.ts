import { useEffect, useRef, useState } from "react";
import { createLiveSync, type StreamFactory } from "../realtime/live-sync";
import { createFetchStreamFactory } from "../realtime/fetch-stream-factory";
import type { DeviceSession } from "./device-session";

export type ControlStreamStatus = "connecting" | "connected" | "reconnecting";

// The Device Control Stream (ADR 0013): the box's long-lived SSE for
// backend→device pushes — `incoming-call` wake-ups, `re-pair`, `config`,
// `start-demo`. Reuses the generic live-sync machinery (reconnect, backoff,
// 401→refresh) with the device token instead of a user token.
export function useDeviceControlStream({
  deviceSession,
  baseUrl,
  enabled,
  onIncomingCall,
  onRePair,
  factory,
}: {
  deviceSession: DeviceSession;
  baseUrl: string;
  enabled: boolean;
  onIncomingCall: () => void;
  onRePair: (newBabyId: string) => void;
  factory?: StreamFactory;
}): ControlStreamStatus {
  const [status, setStatus] = useState<ControlStreamStatus>("connecting");

  // Latest-callback refs so handler identity changes don't tear the stream down.
  const incomingCallRef = useRef(onIncomingCall);
  incomingCallRef.current = onIncomingCall;
  const rePairRef = useRef(onRePair);
  rePairRef.current = onRePair;
  const factoryRef = useRef(factory);

  useEffect(() => {
    if (!enabled) return;

    // The transport doesn't surface "open", so status is inferred: delivered
    // event → connected, transport error → reconnecting (live-sync is already
    // scheduling the reopen).
    const inner = factoryRef.current ?? createFetchStreamFactory();
    const observed: StreamFactory = {
      open(opts) {
        setStatus((s) => (s === "connecting" ? "connecting" : s));
        return inner.open({
          ...opts,
          onEvent: (event) => {
            setStatus("connected");
            opts.onEvent(event);
          },
          onError: (code) => {
            setStatus("reconnecting");
            opts.onError(code);
          },
        });
      },
    };

    const stream = createLiveSync({
      url: `${baseUrl}/device/control`,
      getToken: () => deviceSession.getAccessToken() ?? "",
      factory: observed,
      onAuthError: () => deviceSession.refreshToken(),
    });
    stream.on("incoming-call", () => incomingCallRef.current());
    stream.on("re-pair", (data) => {
      const newBabyId = (data as { newBabyId?: string } | null)?.newBabyId;
      if (newBabyId) rePairRef.current(newBabyId);
    });
    stream.start();
    setStatus("connected");

    return () => stream.stop();
  }, [deviceSession, baseUrl, enabled]);

  return status;
}
