import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createLiveSync, type StreamEvent, type StreamFactory } from "../realtime/live-sync";
import { useCameraStatus } from "./useCameraStatus";

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

describe("useCameraStatus", () => {
  test("reflects camera unavailable then available over live-sync", () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });

    const { result } = renderHook(() => useCameraStatus(liveSync));
    liveSync.start();

    expect(result.current.state).toBe("unknown");

    act(() => fake.emit({ type: "camera-status", data: { available: false, deviceId: "dev_1" } }));
    expect(result.current.state).toBe("unavailable");

    act(() => fake.emit({ type: "camera-status", data: { available: true, deviceId: "dev_1" } }));
    expect(result.current.state).toBe("available");
  });
});
