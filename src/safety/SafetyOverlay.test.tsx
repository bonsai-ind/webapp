import { describe, expect, test } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { createLiveSync, type StreamEvent, type StreamFactory } from "../realtime/live-sync";
import { SafetyOverlay } from "./SafetyOverlay";

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

describe("SafetyOverlay", () => {
  test("shows a safety banner on a prone/occlusion alert", () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });

    render(<SafetyOverlay liveSync={liveSync} />);
    act(() => liveSync.start());

    expect(screen.queryByText(/may be unsafe/i)).not.toBeInTheDocument();

    act(() =>
      fake.emit({
        type: "safety-status",
        data: { state: "alert", posture: "face_down_or_absent", episodeId: "pos-1", babyName: "Mia" },
      }),
    );
    expect(screen.getByText(/mia may be unsafe/i)).toBeInTheDocument();
  });

  test("hides the banner on a clear event", () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });

    render(<SafetyOverlay liveSync={liveSync} />);
    act(() => liveSync.start());
    act(() =>
      fake.emit({
        type: "safety-status",
        data: { state: "alert", posture: "occluded", episodeId: "pos-2", babyName: "Mia" },
      }),
    );
    expect(screen.getByText(/mia may be unsafe/i)).toBeInTheDocument();

    act(() => fake.emit({ type: "safety-status", data: { state: "clear" } }));
    expect(screen.queryByText(/may be unsafe/i)).not.toBeInTheDocument();
  });

  test("shows human-readable copy for the posture", () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });

    render(<SafetyOverlay liveSync={liveSync} />);
    act(() => liveSync.start());
    act(() =>
      fake.emit({
        type: "safety-status",
        data: { state: "alert", posture: "face_down_or_absent", episodeId: "pos-3", babyName: "Mia" },
      }),
    );
    expect(screen.getByText(/face-down|not visible/i)).toBeInTheDocument();
  });
});
