import { describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IncomingCallOverlay } from "./IncomingCallOverlay";
import type { LiveSync } from "../realtime/live-sync";

function fakeLiveSync() {
  const handlers = new Map<string, Set<(data: unknown) => void>>();
  const liveSync: LiveSync = {
    start() {},
    stop() {},
    on(type, handler) {
      const set = handlers.get(type) ?? new Set();
      set.add(handler);
      handlers.set(type, set);
      return () => set.delete(handler);
    },
  };
  return {
    liveSync,
    emit(type: string, data: unknown) {
      for (const h of handlers.get(type) ?? []) h(data);
    },
  };
}

const CALL = {
  callId: "call_1",
  deviceId: "dev_1",
  deviceName: "Sim Cam",
  babyId: "bby_1",
  babyName: "Mia",
};

describe("IncomingCallOverlay", () => {
  test("a call-request frame rings with device and baby context", () => {
    const fake = fakeLiveSync();
    render(<IncomingCallOverlay liveSync={fake.liveSync} onAccept={() => {}} />);

    act(() => fake.emit("call-request", CALL));

    expect(screen.getByRole("alertdialog", { name: "Sim Cam is calling" })).toBeInTheDocument();
    expect(screen.getByText("Mia")).toBeInTheDocument();
  });

  test("Accept dismisses and navigates with the paired babyId", async () => {
    const fake = fakeLiveSync();
    const onAccept = vi.fn();
    render(<IncomingCallOverlay liveSync={fake.liveSync} onAccept={onAccept} />);
    act(() => fake.emit("call-request", CALL));

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(onAccept).toHaveBeenCalledWith("bby_1");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("Decline dismisses without navigating", async () => {
    const fake = fakeLiveSync();
    const onAccept = vi.fn();
    render(<IncomingCallOverlay liveSync={fake.liveSync} onAccept={onAccept} />);
    act(() => fake.emit("call-request", CALL));

    await userEvent.click(screen.getByRole("button", { name: "Decline" }));

    expect(onAccept).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("a replayed callId never re-rings (Last-Event-ID replay guard)", async () => {
    const fake = fakeLiveSync();
    render(<IncomingCallOverlay liveSync={fake.liveSync} onAccept={() => {}} />);
    act(() => fake.emit("call-request", CALL));
    await userEvent.click(screen.getByRole("button", { name: "Decline" }));

    act(() => fake.emit("call-request", CALL));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
