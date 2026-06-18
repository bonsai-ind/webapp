import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createLiveSync, type StreamFactory, type StreamEvent } from "./live-sync";

/**
 * A controllable fake transport. Tests open the client, then push events or
 * trigger errors through the captured callbacks — no real SSE, no network.
 */
function fakeFactory() {
  const opens: Array<{
    url: string;
    token: string;
    lastEventId?: string;
    onEvent: (e: StreamEvent) => void;
    onError: () => void;
    closed: boolean;
  }> = [];
  const factory: StreamFactory = {
    open(opts) {
      const record = { ...opts, closed: false };
      opens.push(record);
      return {
        close() {
          record.closed = true;
        },
      };
    },
  };
  return {
    factory,
    opens,
    latest: () => opens[opens.length - 1],
  };
}

describe("LiveSync", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test("routes an incoming event to the handler registered for its type", () => {
    const fake = fakeFactory();
    const client = createLiveSync({
      url: "https://api.test/live",
      getToken: () => "access-1",
      factory: fake.factory,
    });

    const received: unknown[] = [];
    client.on("baby.updated", (data) => received.push(data));
    client.start();

    fake.latest().onEvent({ type: "baby.updated", data: { id: "baby_1", state: "calm" } });

    expect(received).toEqual([{ id: "baby_1", state: "calm" }]);
  });

  test("reconnects with a fresh token when the stream errors", () => {
    let token = "access-1";
    const fake = fakeFactory();
    const client = createLiveSync({
      url: "https://api.test/live",
      getToken: () => token,
      factory: fake.factory,
    });

    client.start();
    expect(fake.opens.length).toBe(1);
    expect(fake.opens[0].token).toBe("access-1");

    token = "access-2"; // token rotated while connected (server force-closed at expiry)
    fake.opens[0].onError();
    vi.runOnlyPendingTimers(); // let any backoff delay elapse

    expect(fake.opens.length).toBe(2);
    expect(fake.opens[1].token).toBe("access-2");
  });

  test("resyncs from the last received event id after a reconnect", () => {
    const fake = fakeFactory();
    const client = createLiveSync({
      url: "https://api.test/live",
      getToken: () => "t",
      factory: fake.factory,
    });

    client.start();
    expect(fake.opens[0].lastEventId).toBeUndefined();

    fake.opens[0].onEvent({ id: "evt-7", type: "baby.updated", data: {} });
    fake.opens[0].onError();
    vi.runOnlyPendingTimers(); // let any backoff delay elapse

    expect(fake.opens[1].lastEventId).toBe("evt-7");
  });

  test("delivers a cry episode only once even if its event is redelivered", () => {
    const fake = fakeFactory();
    const client = createLiveSync({
      url: "https://api.test/live",
      getToken: () => "t",
      factory: fake.factory,
      dedupeKey: (e) =>
        e.type === "cry" ? (e.data as { episodeId: string }).episodeId : undefined,
    });

    const cries: unknown[] = [];
    client.on("cry", (d) => cries.push(d));
    client.start();

    fake.latest().onEvent({ id: "evt-1", type: "cry", data: { episodeId: "ep-1" } });
    fake.latest().onEvent({ id: "evt-1", type: "cry", data: { episodeId: "ep-1" } }); // replay
    fake.latest().onEvent({ id: "evt-2", type: "cry", data: { episodeId: "ep-2" } }); // new episode

    expect(cries).toEqual([{ episodeId: "ep-1" }, { episodeId: "ep-2" }]);
  });

  test("delays reconnect by the base backoff instead of reopening immediately", () => {
    const fake = fakeFactory();
    const client = createLiveSync({
      url: "https://api.test/live",
      getToken: () => "t",
      factory: fake.factory,
      backoff: { baseMs: 1000, maxMs: 30000 },
    });

    client.start();
    fake.opens[0].onError();
    expect(fake.opens.length).toBe(1); // not reopened immediately

    vi.advanceTimersByTime(999);
    expect(fake.opens.length).toBe(1); // still within the base delay

    vi.advanceTimersByTime(1);
    expect(fake.opens.length).toBe(2); // base delay elapsed → reconnect
  });

  test("backs off exponentially on consecutive failures, capped at maxMs", () => {
    const fake = fakeFactory();
    const client = createLiveSync({
      url: "https://api.test/live",
      getToken: () => "t",
      factory: fake.factory,
      backoff: { baseMs: 1000, maxMs: 4000 },
    });

    client.start(); // open #1
    const reconnectAfter = (ms: number, expectedOpens: number) => {
      fake.latest().onError();
      vi.advanceTimersByTime(ms - 1);
      expect(fake.opens.length).toBe(expectedOpens - 1);
      vi.advanceTimersByTime(1);
      expect(fake.opens.length).toBe(expectedOpens);
    };

    reconnectAfter(1000, 2); // base
    reconnectAfter(2000, 3); // ×2
    reconnectAfter(4000, 4); // ×2 → 4000 (== cap)
    reconnectAfter(4000, 5); // would be 8000, capped at 4000
  });

  test("resets the backoff after a successful connection delivers an event", () => {
    const fake = fakeFactory();
    const client = createLiveSync({
      url: "https://api.test/live",
      getToken: () => "t",
      factory: fake.factory,
      backoff: { baseMs: 1000, maxMs: 30000 },
    });

    client.start();
    fake.latest().onError(); // grow to 2000
    vi.advanceTimersByTime(1000);
    fake.latest().onError(); // grow to 4000
    vi.advanceTimersByTime(2000);
    expect(fake.opens.length).toBe(3);

    fake.latest().onEvent({ type: "baby.updated", data: {} }); // connection is healthy again

    fake.latest().onError();
    vi.advanceTimersByTime(999);
    expect(fake.opens.length).toBe(3); // not yet
    vi.advanceTimersByTime(1);
    expect(fake.opens.length).toBe(4); // backed off from base (1000), not the grown 4000
  });
});
