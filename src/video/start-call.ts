export type Signal =
  | { kind: "ready" }
  | { kind: "offer"; sdp: unknown }
  | { kind: "answer"; sdp: unknown }
  | { kind: "ice"; candidate: unknown };

export interface SignalingChannel {
  send(signal: Signal): void;
  onMessage(handler: (signal: Signal) => void): () => void;
}

// The subset of RTCPeerConnection the orchestrator drives.
export interface PeerConnection {
  createOffer(): Promise<unknown>;
  createAnswer(): Promise<unknown>;
  setLocalDescription(description: unknown): Promise<void>;
  setRemoteDescription(description: unknown): Promise<void>;
  addIceCandidate(candidate: unknown): Promise<void>;
  onicecandidate: ((event: { candidate: unknown }) => void) | null;
}

export interface Call {
  hangUp(): void;
}

// Drives the 1-to-1 offer/answer/ICE handshake (FRONTEND.md, ADR-0004). Pure
// coordination over an injected peer + signaling channel — no React, no real
// WebRTC, no transport. The caller waits for the device to announce itself with
// a `ready` frame before sending its offer (the device is asleep until woken).
export function startCall({
  pc,
  signaling,
  role,
}: {
  pc: PeerConnection;
  signaling: SignalingChannel;
  role: "caller" | "callee";
}): Call {
  // Latch so a doubled `ready` frame still yields exactly one offer.
  let offered = false;
  const sendOffer = () => {
    if (offered) return;
    offered = true;
    void (async () => {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      signaling.send({ kind: "offer", sdp: offer });
    })();
  };

  // Send locally-gathered ICE candidates; the null event marks end-of-candidates.
  pc.onicecandidate = (event) => {
    if (event.candidate) signaling.send({ kind: "ice", candidate: event.candidate });
  };

  const unsubscribe = signaling.onMessage((signal) => {
    if (signal.kind === "ready") {
      // The device is awake and listening — only now is it safe to offer. The
      // callee never offers, so it ignores `ready`.
      if (role === "caller") sendOffer();
    } else if (signal.kind === "offer") {
      void (async () => {
        await pc.setRemoteDescription(signal.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signaling.send({ kind: "answer", sdp: answer });
      })();
    } else if (signal.kind === "answer") {
      void pc.setRemoteDescription(signal.sdp);
    } else if (signal.kind === "ice") {
      void pc.addIceCandidate(signal.candidate);
    }
  });

  return { hangUp: () => unsubscribe() };
}
