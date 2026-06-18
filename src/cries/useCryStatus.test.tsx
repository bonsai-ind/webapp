import { describe, expect, test } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { createLiveSync, type StreamEvent, type StreamFactory } from "../realtime/live-sync";
import { useCryStatus } from "./useCryStatus";

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

describe("useCryStatus", () => {
  test("reflects a crying status pushed over live-sync", () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });

    const { result } = renderHook(() => useCryStatus(liveSync));
    liveSync.start();

    act(() => {
      fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-7", babyName: "Mia" } });
    });

    expect(result.current.status).toBe("crying");
    expect(result.current.episode?.babyName).toBe("Mia");
  });
});
