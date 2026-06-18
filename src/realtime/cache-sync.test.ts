import { describe, expect, test } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createLiveSync, type StreamEvent, type StreamFactory } from "./live-sync";
import { createCacheSync } from "./cache-sync";

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

function setup(resources: string[]) {
  const fake = fakeFactory();
  const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });
  const queryClient = new QueryClient();
  const unsubscribe = createCacheSync({ liveSync, queryClient, resources });
  liveSync.start();
  return { emit: fake.emit, queryClient, unsubscribe };
}

describe("createCacheSync", () => {
  test("writes a mirrored resource's event data into the query cache", () => {
    const { emit, queryClient } = setup(["babies"]);

    emit({ type: "babies", data: [{ id: "baby_1", name: "Mia" }] });

    expect(queryClient.getQueryData(["babies"])).toEqual([{ id: "baby_1", name: "Mia" }]);
  });

  test("a later event fully replaces the earlier cached value (no merge)", () => {
    const { emit, queryClient } = setup(["babies"]);

    emit({ type: "babies", data: [{ id: "baby_1", name: "Mia" }] });
    emit({ type: "babies", data: [{ id: "baby_2", name: "Leo" }] });

    expect(queryClient.getQueryData(["babies"])).toEqual([{ id: "baby_2", name: "Leo" }]);
  });

  test("ignores events for resources it is not mirroring", () => {
    const { emit, queryClient } = setup(["babies"]);

    emit({ type: "sleep", data: [1, 2, 3] });

    expect(queryClient.getQueryData(["sleep"])).toBeUndefined();
  });

  test("unsubscribe stops further cache writes", () => {
    const { emit, queryClient, unsubscribe } = setup(["babies"]);

    unsubscribe();
    emit({ type: "babies", data: [{ id: "baby_1", name: "Mia" }] });

    expect(queryClient.getQueryData(["babies"])).toBeUndefined();
  });
});
