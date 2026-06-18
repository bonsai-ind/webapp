// @vitest-environment node
// fetch-event-source builds an AbortController from the global; jsdom's signal is
// rejected by Node's undici fetch, so this transport test runs in the node env —
// with a minimal window/document shim the library expects for page-visibility.
import { beforeAll, describe, expect, test } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "../test/server";
import { createFetchStreamFactory } from "./fetch-stream-factory";

const BASE = "https://api.test";

beforeAll(() => {
  (globalThis as unknown as { window: unknown }).window = globalThis;
  (globalThis as unknown as { document: unknown }).document = {
    addEventListener() {},
    removeEventListener() {},
    hidden: false,
    visibilityState: "visible",
  };
});

// Build a text/event-stream body from raw SSE frames.
function sseStream(frames: string[]) {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      for (const f of frames) c.enqueue(enc.encode(f));
      c.close();
    },
  });
}

describe("createFetchStreamFactory", () => {
  test("delivers a parsed SSE event to onEvent", async () => {
    server.use(
      http.get(`${BASE}/live`, () =>
        new HttpResponse(sseStream(['event: babies\ndata: {"id":"baby_1"}\nid: evt-1\n\n']), {
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );

    const factory = createFetchStreamFactory();
    const event = await new Promise((resolve) => {
      const handle = factory.open({
        url: `${BASE}/live`,
        token: "access-1",
        onEvent: (e) => {
          handle.close();
          resolve(e);
        },
        onError: () => {},
      });
    });

    expect(event).toEqual({ id: "evt-1", type: "babies", data: { id: "baby_1" } });
  });

  test("sends the bearer token and Last-Event-ID header", async () => {
    let auth: string | null = null;
    let lastId: string | null = null;
    server.use(
      http.get(`${BASE}/live`, ({ request }) => {
        auth = request.headers.get("authorization");
        lastId = request.headers.get("last-event-id");
        return new HttpResponse(sseStream(["data: {}\n\n"]), {
          headers: { "Content-Type": "text/event-stream" },
        });
      }),
    );

    const factory = createFetchStreamFactory();
    await new Promise<void>((resolve) => {
      const handle = factory.open({
        url: `${BASE}/live`,
        token: "access-9",
        lastEventId: "evt-42",
        onEvent: () => {
          handle.close();
          resolve();
        },
        onError: () => {},
      });
    });

    expect(auth).toBe("Bearer access-9");
    expect(lastId).toBe("evt-42");
  });

  // NOTE: close() aborts the connection via AbortController (fetch-event-source
  // wires the passed signal to abort its request). That cancellation isn't
  // behaviourally testable here because MSW's in-memory stream keeps delivering
  // after a fetch abort (a real TCP connection would be cancelled). Verified
  // against a real SSE server / in the running app, not this harness.
});
