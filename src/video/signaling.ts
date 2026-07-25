import type { Session } from "../session/session";
import type { StreamEvent, StreamFactory } from "../realtime/live-sync";
import { createFetchStreamFactory } from "../realtime/fetch-stream-factory";
import type { Signal, SignalingChannel } from "./start-call";

// The slice of Session the channel needs — structural, so a device session
// (the simulator acting as the camera peer) can drive the same channel.
export type SignalingSession = Pick<Session, "authedFetch" | "getAccessToken">;

// Map a relayed SSE frame to a Signal the call orchestrator understands. The
// backend relays the *whole* SignalFrame `{kind, sdp?, candidate?}` as `data`
// (keyed by `event: <kind>`), where `sdp` is the bare SDP string — so the
// RTCSessionDescriptionInit `{type, sdp}` is reconstructed here from the event
// name, and the ICE candidate is the inner object, not the frame.
export function frameToSignal(event: StreamEvent): Signal {
  if (event.type === "ready" || event.type === "camera-on" || event.type === "camera-off") {
    return { kind: event.type };
  }
  const frame = (event.data ?? {}) as { sdp?: string; candidate?: unknown };
  if (event.type === "ice") return { kind: "ice", candidate: frame.candidate };
  return {
    kind: event.type as "offer" | "answer",
    sdp: { type: event.type, sdp: frame.sdp ?? "" },
  };
}

// Map an outbound Signal to the backend SignalFrame wire shape: `sdp` must be
// the bare SDP string (Go decodes it into a `string` with DisallowUnknownFields,
// so posting the whole description object is a 400); the candidate rides
// verbatim (JSON.stringify invokes RTCIceCandidate.toJSON).
export function signalToFrame(signal: Signal): Record<string, unknown> {
  if (signal.kind === "offer" || signal.kind === "answer") {
    const description = signal.sdp as { sdp?: string } | null | undefined;
    return { kind: signal.kind, sdp: description?.sdp ?? "" };
  }
  if (signal.kind === "ice") return { kind: "ice", candidate: signal.candidate };
  return { kind: signal.kind }; // payload-less kinds: ready, camera-on, camera-off
}

/**
 * Signaling channel for a 1-to-1 call over the device's ephemeral signaling
 * stream (ADR-0004): SSE down (GET) → onMessage, plain POST up → send.
 */
export function createSignalingChannel({
  session,
  baseUrl,
  deviceId,
  factory = createFetchStreamFactory(),
  onOpen,
}: {
  session: SignalingSession;
  baseUrl: string;
  deviceId: string;
  factory?: StreamFactory;
  // Fired when the down-stream is established (the peer is joined to the call
  // room). The relay hub does not buffer, so `ready` (device) and the wake
  // (viewer) must wait for this — sending earlier can drop the other peer's
  // reply on the floor and deadlock the handshake.
  onOpen?: () => void;
}): SignalingChannel {
  const path = `/devices/${deviceId}/call/signal`;

  // Sends are serialized: each POST waits for the previous one to complete, so
  // frames reach the relay in send order. Parallel fire-and-forget POSTs can
  // reorder in transit — an ICE candidate overtaking its offer makes the peer
  // throw "remote description was null" and lose the candidate.
  let sendQueue: Promise<unknown> = Promise.resolve();

  return {
    send(signal) {
      sendQueue = sendQueue.then(() =>
        session
          .authedFetch(path, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(signalToFrame(signal)),
          })
          .catch(() => {}),
      );
    },
    onMessage(handler) {
      const handle = factory.open({
        url: `${baseUrl}${path}`,
        token: session.getAccessToken() ?? "",
        onEvent: (event) => handler(frameToSignal(event)),
        onError: () => {},
        onOpen,
      });
      return () => handle.close();
    },
  };
}
