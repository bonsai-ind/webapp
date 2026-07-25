import { describe, expect, test } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { StreamEvent, StreamFactory } from "../realtime/live-sync";
import { createDeviceSession } from "./device-session";
import { useDeviceControlStream } from "./useDeviceControlStream";

const BASE = "https://api.test";

function fakeFactory() {
  let emit: ((e: StreamEvent) => void) | null = null;
  let opened = 0;
  let lastToken: string | undefined;
  const factory: StreamFactory = {
    open(opts) {
      opened += 1;
      lastToken = opts.token;
      emit = opts.onEvent;
      return { close() {} };
    },
  };
  return {
    factory,
    emit: (e: StreamEvent) => emit?.(e),
    openedCount: () => opened,
    lastToken: () => lastToken,
  };
}

describe("useDeviceControlStream", () => {
  test("opens the control stream with the device token and dispatches frames", () => {
    const fake = fakeFactory();
    const ds = createDeviceSession({ baseUrl: BASE, serial: "SIM-TEST" });
    ds.adoptTokens("dev-acc", "dev-ref");
    const incoming: number[] = [];
    const rePairs: string[] = [];

    renderHook(() =>
      useDeviceControlStream({
        deviceSession: ds,
        baseUrl: BASE,
        enabled: true,
        onIncomingCall: () => incoming.push(1),
        onRePair: (babyId) => rePairs.push(babyId),
        factory: fake.factory,
      }),
    );

    expect(fake.openedCount()).toBe(1);
    expect(fake.lastToken()).toBe("dev-acc");

    act(() => {
      fake.emit({ type: "incoming-call", data: null });
      fake.emit({ type: "re-pair", data: { newBabyId: "bby_9" } });
    });

    expect(incoming).toEqual([1]);
    expect(rePairs).toEqual(["bby_9"]);
  });

  test("does not open the stream while disabled", () => {
    const fake = fakeFactory();
    const ds = createDeviceSession({ baseUrl: BASE, serial: "SIM-TEST" });

    renderHook(() =>
      useDeviceControlStream({
        deviceSession: ds,
        baseUrl: BASE,
        enabled: false,
        onIncomingCall: () => {},
        onRePair: () => {},
        factory: fake.factory,
      }),
    );

    expect(fake.openedCount()).toBe(0);
  });
});
