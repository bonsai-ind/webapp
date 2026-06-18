import { describe, expect, test, vi } from "vitest";
import { startCall, type PeerConnection, type Signal, type SignalingChannel } from "./start-call";

function fakePeer(overrides: Partial<PeerConnection> = {}): PeerConnection {
  return {
    createOffer: vi.fn().mockResolvedValue({ type: "offer", sdp: "OFFER_SDP" }),
    createAnswer: vi.fn().mockResolvedValue({ type: "answer", sdp: "ANSWER_SDP" }),
    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),
    onicecandidate: null,
    ...overrides,
  };
}

function fakeSignaling() {
  const sent: Signal[] = [];
  let handler: (s: Signal) => void = () => {};
  const channel: SignalingChannel = {
    send: (s) => sent.push(s),
    onMessage: (h) => {
      handler = h;
      return () => {};
    },
  };
  return { channel, sent, receive: (s: Signal) => handler(s) };
}

describe("startCall", () => {
  test("the caller creates an offer and sends it over signaling", async () => {
    const pc = fakePeer();
    const sig = fakeSignaling();

    startCall({ pc, signaling: sig.channel, role: "caller" });
    await vi.waitFor(() => expect(sig.sent.length).toBeGreaterThan(0));

    expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: "offer", sdp: "OFFER_SDP" });
    expect(sig.sent[0]).toEqual({ kind: "offer", sdp: { type: "offer", sdp: "OFFER_SDP" } });
  });

  test("the caller applies a received answer as the remote description", async () => {
    const pc = fakePeer();
    const sig = fakeSignaling();

    startCall({ pc, signaling: sig.channel, role: "caller" });
    sig.receive({ kind: "answer", sdp: { type: "answer", sdp: "ANSWER_SDP" } });

    await vi.waitFor(() =>
      expect(pc.setRemoteDescription).toHaveBeenCalledWith({ type: "answer", sdp: "ANSWER_SDP" }),
    );
  });

  test("exchanges ICE candidates in both directions", async () => {
    const pc = fakePeer();
    const sig = fakeSignaling();

    startCall({ pc, signaling: sig.channel, role: "caller" });

    // A locally-gathered candidate is sent over signaling.
    pc.onicecandidate?.({ candidate: "CAND_LOCAL" });
    expect(sig.sent).toContainEqual({ kind: "ice", candidate: "CAND_LOCAL" });

    // A remotely-received candidate is added to the peer.
    sig.receive({ kind: "ice", candidate: "CAND_REMOTE" });
    await vi.waitFor(() => expect(pc.addIceCandidate).toHaveBeenCalledWith("CAND_REMOTE"));
  });

  test("the end-of-candidates event (null) is not sent", () => {
    const pc = fakePeer();
    const sig = fakeSignaling();
    startCall({ pc, signaling: sig.channel, role: "caller" });

    pc.onicecandidate?.({ candidate: null });

    expect(sig.sent.some((s) => s.kind === "ice")).toBe(false);
  });

  test("the callee answers a received offer", async () => {
    const pc = fakePeer();
    const sig = fakeSignaling();

    startCall({ pc, signaling: sig.channel, role: "callee" });
    // A callee makes no offer of its own.
    expect(pc.createOffer).not.toHaveBeenCalled();

    sig.receive({ kind: "offer", sdp: { type: "offer", sdp: "OFFER_SDP" } });

    await vi.waitFor(() =>
      expect(sig.sent).toContainEqual({ kind: "answer", sdp: { type: "answer", sdp: "ANSWER_SDP" } }),
    );
    expect(pc.setRemoteDescription).toHaveBeenCalledWith({ type: "offer", sdp: "OFFER_SDP" });
    expect(pc.setLocalDescription).toHaveBeenCalledWith({ type: "answer", sdp: "ANSWER_SDP" });
  });
});
