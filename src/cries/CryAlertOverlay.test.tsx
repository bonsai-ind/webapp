import { describe, expect, test } from "vitest";
import { act, screen } from "@testing-library/react";
import { renderWithQuery } from "../test/query";
import { createLiveSync, type StreamEvent, type StreamFactory } from "../realtime/live-sync";
import { CryAlertOverlay } from "./CryAlertOverlay";

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

describe("CryAlertOverlay", () => {
  test("shows the full-screen alert on a crying event and hides it on calm", () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });

    renderWithQuery(<CryAlertOverlay liveSync={liveSync} />);
    act(() => liveSync.start());

    expect(screen.queryByText(/is crying/i)).not.toBeInTheDocument();

    act(() => fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-1", babyName: "Mia" } }));
    expect(screen.getByText(/mia is crying/i)).toBeInTheDocument();

    act(() => fake.emit({ type: "cry-status", data: { state: "calm" } }));
    expect(screen.queryByText(/is crying/i)).not.toBeInTheDocument();
  });
});
