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

function setup(props: { onOpenMonitor?: (babyId?: string) => void } = {}) {
  const fake = fakeFactory();
  const liveSync = createLiveSync({ url: "u", getToken: () => "t", factory: fake.factory });
  renderWithQuery(<CryAlertOverlay liveSync={liveSync} {...props} />);
  act(() => liveSync.start());
  return fake;
}

describe("CryAlertOverlay", () => {
  test("shows the full-screen alert on a crying event and hides it on the episode's calm", () => {
    const fake = setup();

    expect(screen.queryByText(/is crying/i)).not.toBeInTheDocument();

    act(() => fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-1", babyName: "Mia" } }));
    expect(screen.getByText(/mia is crying/i)).toBeInTheDocument();
    expect(screen.getByText(/started \d+s ago/i)).toBeInTheDocument();

    act(() => fake.emit({ type: "cry-status", data: { state: "calm", episodeId: "ep-1" } }));
    expect(screen.queryByText(/is crying/i)).not.toBeInTheDocument();
  });

  test("a calm for a DIFFERENT baby keeps the alert up (twins)", () => {
    const fake = setup();

    act(() =>
      fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-a", babyId: "bby_a", babyName: "Mia" } }),
    );
    act(() =>
      fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-b", babyId: "bby_b", babyName: "Noah" } }),
    );
    expect(screen.getByText(/noah is crying/i)).toBeInTheDocument();

    act(() => fake.emit({ type: "cry-status", data: { state: "calm", episodeId: "ep-b", babyId: "bby_b" } }));
    // Mia's ongoing episode takes the takeover back over.
    expect(screen.getByText(/mia is crying/i)).toBeInTheDocument();
  });

  test("Open navigates with the episode's babyId, then dismisses the takeover", async () => {
    const onOpenMonitor = vi.fn();
    const fake = setup({ onOpenMonitor });

    act(() =>
      fake.emit({
        type: "cry-status",
        data: { state: "crying", episodeId: "ep-1", babyId: "bby_42", babyName: "Mia" },
      }),
    );

    await userEvent.click(screen.getByRole("button", { name: /open live monitor/i }));
    expect(onOpenMonitor).toHaveBeenCalledWith("bby_42");
    expect(screen.queryByText(/mia is crying/i)).not.toBeInTheDocument();
  });

  test("Snooze hides the takeover; a NEW episode still shows through it", async () => {
    const fake = setup();
    act(() => fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-1", babyName: "Mia" } }));

    await userEvent.click(screen.getByRole("button", { name: /snooze 5 min/i }));
    expect(screen.queryByText(/mia is crying/i)).not.toBeInTheDocument();

    // A NEW episode shows immediately despite the snooze on the old one.
    act(() => fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-2", babyName: "Mia" } }));
    expect(screen.getByText(/mia is crying/i)).toBeInTheDocument();
  });

  test("the snooze lapses and the still-active episode re-nags", () => {
    vi.useFakeTimers();
    try {
      const fake = setup();
      act(() => fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-1", babyName: "Mia" } }));

      // Snooze via fireEvent-style direct click (userEvent hangs under fake timers).
      act(() => {
        screen.getByRole("button", { name: /snooze 5 min/i }).click();
      });
      expect(screen.queryByText(/mia is crying/i)).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(5 * 60_000 + 200);
      });
      expect(screen.getByText(/mia is crying/i)).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  test("there is no Talk button (Open is the single action)", () => {
    const fake = setup();
    act(() => fake.emit({ type: "cry-status", data: { state: "crying", episodeId: "ep-1", babyName: "Mia" } }));
    expect(screen.queryByRole("button", { name: /^talk$/i })).not.toBeInTheDocument();
  });
});
