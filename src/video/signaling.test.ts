import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import type { StreamEvent, StreamFactory } from "../realtime/live-sync";
import { createSignalingChannel, frameToSignal, signalToFrame } from "./signaling";

const BASE = "https://api.test";

describe("frameToSignal", () => {
  test("reconstructs a description from a relayed offer frame (bare sdp string)", () => {
    expect(frameToSignal({ type: "offer", data: { kind: "offer", sdp: "v=0..." } })).toEqual({
      kind: "offer",
      sdp: { type: "offer", sdp: "v=0..." },
    });
  });

  test("reconstructs a description from a relayed answer frame", () => {
    expect(frameToSignal({ type: "answer", data: { kind: "answer", sdp: "A" } })).toEqual({
      kind: "answer",
      sdp: { type: "answer", sdp: "A" },
    });
  });

  test("unwraps the inner candidate from a relayed ice frame", () => {
    expect(
      frameToSignal({ type: "ice", data: { kind: "ice", candidate: { candidate: "c", sdpMid: "0" } } }),
    ).toEqual({ kind: "ice", candidate: { candidate: "c", sdpMid: "0" } });
  });

  test("maps a ready frame to a ready signal (no payload)", () => {
    expect(frameToSignal({ type: "ready", data: null })).toEqual({ kind: "ready" });
  });

  test("maps camera-state frames to payload-less signals", () => {
    expect(frameToSignal({ type: "camera-on", data: null })).toEqual({ kind: "camera-on" });
    expect(frameToSignal({ type: "camera-off", data: null })).toEqual({ kind: "camera-off" });
  });
});

describe("signalToFrame", () => {
  test("extracts the bare SDP string from an offer description", () => {
    expect(signalToFrame({ kind: "offer", sdp: { type: "offer", sdp: "v=0..." } })).toEqual({
      kind: "offer",
      sdp: "v=0...",
    });
  });

  test("passes the candidate through verbatim", () => {
    expect(signalToFrame({ kind: "ice", candidate: { candidate: "c" } })).toEqual({
      kind: "ice",
      candidate: { candidate: "c" },
    });
  });

  test("ready is payload-less", () => {
    expect(signalToFrame({ kind: "ready" })).toEqual({ kind: "ready" });
  });

  test("camera-state signals are payload-less frames", () => {
    expect(signalToFrame({ kind: "camera-on" })).toEqual({ kind: "camera-on" });
    expect(signalToFrame({ kind: "camera-off" })).toEqual({ kind: "camera-off" });
  });
});

function fakeFactory() {
  let emit: (e: StreamEvent) => void = () => {};
  const factory: StreamFactory = {
    open(opts) {
      emit = opts.onEvent;
      return { close() {} };
    },
  };
  return { factory, emit: (e: StreamEvent) => emit(e) };
}

describe("createSignalingChannel", () => {
  test("send POSTs the wire-shaped frame to the device call channel", async () => {
    let body: unknown;
    server.use(
      http.post(`${BASE}/devices/dev_1/call/signal`, async ({ request }) => {
        body = await request.json();
        return new HttpResponse(null, { status: 204 });
      }),
    );

    const ch = createSignalingChannel({
      session: createSession({ baseUrl: BASE }),
      baseUrl: BASE,
      deviceId: "dev_1",
      factory: fakeFactory().factory,
    });
    ch.send({ kind: "offer", sdp: { type: "offer", sdp: "v=0..." } });

    await vi.waitFor(() => expect(body).toEqual({ kind: "offer", sdp: "v=0..." }));
  });

  test("onMessage delivers mapped signals from the SSE stream", () => {
    const fake = fakeFactory();
    const ch = createSignalingChannel({
      session: createSession({ baseUrl: BASE }),
      baseUrl: BASE,
      deviceId: "dev_1",
      factory: fake.factory,
    });

    const received: unknown[] = [];
    ch.onMessage((s) => received.push(s));
    fake.emit({ type: "answer", data: { kind: "answer", sdp: "A" } });

    expect(received).toEqual([{ kind: "answer", sdp: { type: "answer", sdp: "A" } }]);
  });
});
