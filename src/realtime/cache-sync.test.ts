import { describe, expect, test, vi } from "vitest";
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
  const invalidate = vi.spyOn(queryClient, "invalidateQueries");
  const unsubscribe = createCacheSync({ liveSync, queryClient, resources });
  liveSync.start();
  return { emit: fake.emit, invalidate, unsubscribe };
}

describe("createCacheSync", () => {
  test("a resource frame invalidates the resource's queries by key prefix", () => {
    const { emit, invalidate } = setup(["summary"]);

    emit({ type: "summary", data: { cryEpisodes: 3 } });

    // Prefix key: reaches ["summary"] AND every per-baby ["summary", babyId].
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["summary"] });
  });

  test("ignores frames for resources it is not mirroring", () => {
    const { emit, invalidate } = setup(["babies"]);

    emit({ type: "sleep", data: [1, 2, 3] });

    expect(invalidate).not.toHaveBeenCalled();
  });

  test("unsubscribe stops further invalidations", () => {
    const { emit, invalidate, unsubscribe } = setup(["babies"]);

    unsubscribe();
    emit({ type: "babies", data: [] });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
