// Pure call-state transitions for the simulator's camera-peer side, extracted
// from useDeviceCall so the protocol rules are unit-testable without WebRTC.
//
// The key rule: an `incoming-call` wake while already ringing re-sends `ready`
// instead of starting over. That makes viewer/device ordering self-healing —
// whichever side arrives first, the viewer's wake elicits a fresh `ready`, and
// startCall's caller-side latch collapses doubled `ready`s into one offer.

export type CallPhase = "idle" | "ringing" | "live" | "ended";

export type CallEvent =
  | "start" // begin answering: media acquired, signaling joined, ready sent
  | "incoming-call" // wake frame from the control stream
  | "connected" // peer connection reached connected
  | "disconnected" // peer connection failed/closed
  | "hangup"
  | "timeout"; // nobody offered within the ringing window

export interface Transition {
  phase: CallPhase;
  // Join the room + send `ready` (the full answer flow starts).
  answer: boolean;
  // Already in the room — just re-announce `ready`.
  resendReady: boolean;
  // Tear down media/pc/signaling.
  teardown: boolean;
}

const stay = (phase: CallPhase): Transition => ({ phase, answer: false, resendReady: false, teardown: false });

export function transition(phase: CallPhase, event: CallEvent, { autoAnswer }: { autoAnswer: boolean }): Transition {
  switch (event) {
    case "start":
      if (phase === "idle" || phase === "ended") {
        return { phase: "ringing", answer: true, resendReady: false, teardown: false };
      }
      return stay(phase);
    case "incoming-call":
      if (phase === "ringing") return { phase: "ringing", answer: false, resendReady: true, teardown: false };
      if ((phase === "idle" || phase === "ended") && autoAnswer) {
        return { phase: "ringing", answer: true, resendReady: false, teardown: false };
      }
      return stay(phase); // live call in progress, or auto-answer off → ignore
    case "connected":
      return phase === "ringing" ? stay("live") : stay(phase);
    case "disconnected":
      if (phase === "live" || phase === "ringing") {
        return { phase: "ended", answer: false, resendReady: false, teardown: true };
      }
      return stay(phase);
    case "timeout":
      if (phase === "ringing") return { phase: "idle", answer: false, resendReady: false, teardown: true };
      return stay(phase);
    case "hangup":
      if (phase === "idle") return stay(phase);
      return { phase: "idle", answer: false, resendReady: false, teardown: true };
  }
}
