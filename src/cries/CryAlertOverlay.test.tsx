import { describe, expect, test, vi } from "vitest";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  test("Open and Talk navigate with the episode's babyId, then dismiss the takeover", async () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });
    const onOpenMonitor = vi.fn();
    const onTalk = vi.fn();

    renderWithQuery(
      <CryAlertOverlay liveSync={liveSync} onOpenMonitor={onOpenMonitor} onTalk={onTalk} />,
    );
    act(() => liveSync.start());
    act(() =>
      fake.emit({
        type: "cry-status",
        data: { state: "crying", episodeId: "ep-1", babyId: "bby_42", babyName: "Mia" },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: /open live monitor/i }));
    expect(onOpenMonitor).toHaveBeenCalledWith("bby_42");
    // Open dismisses the takeover.
    expect(screen.queryByText(/mia is crying/i)).not.toBeInTheDocument();
  });

  test("Talk navigates with the episode's babyId", async () => {
    const fake = fakeFactory();
    const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });
    const onTalk = vi.fn();

    renderWithQuery(<CryAlertOverlay liveSync={liveSync} onTalk={onTalk} />);
    act(() => liveSync.start());
    act(() =>
      fake.emit({
        type: "cry-status",
        data: { state: "crying", episodeId: "ep-2", babyId: "bby_7", babyName: "Mia" },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: /^talk$/i }));
    expect(onTalk).toHaveBeenCalledWith("bby_7");
  });
});
