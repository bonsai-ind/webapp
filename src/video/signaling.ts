import type { Session } from "../session/session";
import type { StreamEvent, StreamFactory } from "../realtime/live-sync";
import { createFetchStreamFactory } from "../realtime/fetch-stream-factory";
import type { Signal, SignalingChannel } from "./start-call";

// Map a relayed SSE frame (event: offer|answer|ice + data) to a Signal the
// call orchestrator understands.
export function frameToSignal(event: StreamEvent): Signal {
  if (event.type === "ready") return { kind: "ready" };
  if (event.type === "ice") return { kind: "ice", candidate: event.data };
  return { kind: event.type as "offer" | "answer", sdp: event.data };
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
}: {
  session: Session;
  baseUrl: string;
  deviceId: string;
  factory?: StreamFactory;
}): SignalingChannel {
  const path = `/devices/${deviceId}/call/signal`;

  return {
    send(signal) {
      void session.authedFetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signal),
      });
    },
    onMessage(handler) {
      const handle = factory.open({
        url: `${baseUrl}${path}`,
        token: session.getAccessToken() ?? "",
        onEvent: (event) => handler(frameToSignal(event)),
        onError: () => {},
      });
      return () => handle.close();
    },
  };
}
