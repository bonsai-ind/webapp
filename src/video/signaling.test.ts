import { describe, expect, test, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createSession } from "../session/session";
import type { StreamEvent, StreamFactory } from "../realtime/live-sync";
import { createSignalingChannel, frameToSignal } from "./signaling";

const BASE = "https://api.test";

describe("frameToSignal", () => {
  test("maps an offer/answer frame to a description signal", () => {
    expect(frameToSignal({ type: "offer", data: { type: "offer", sdp: "SDP" } })).toEqual({
      kind: "offer",
      sdp: { type: "offer", sdp: "SDP" },
    });
  });

  test("maps an ice frame to a candidate signal", () => {
    expect(frameToSignal({ type: "ice", data: { candidate: "c" } })).toEqual({
      kind: "ice",
      candidate: { candidate: "c" },
    });
  });

  test("maps a ready frame to a ready signal (no payload)", () => {
    expect(frameToSignal({ type: "ready", data: null })).toEqual({ kind: "ready" });
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
  test("send POSTs the signal to the device call channel", async () => {
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
    ch.send({ kind: "offer", sdp: { type: "offer", sdp: "SDP" } });

    await vi.waitFor(() => expect(body).toEqual({ kind: "offer", sdp: { type: "offer", sdp: "SDP" } }));
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
    fake.emit({ type: "answer", data: { type: "answer", sdp: "A" } });

    expect(received).toEqual([{ kind: "answer", sdp: { type: "answer", sdp: "A" } }]);
  });
});
