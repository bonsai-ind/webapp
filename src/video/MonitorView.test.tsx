import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MonitorView } from "./MonitorView";

describe("MonitorView", () => {
  test("reflects the connection status", () => {
    const { rerender } = render(<MonitorView status="connecting" onHoldStart={() => {}} onHoldEnd={() => {}} />);
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();

    rerender(<MonitorView status="live" onHoldStart={() => {}} onHoldEnd={() => {}} />);
    expect(screen.getByText(/^live$/i)).toBeInTheDocument();
  });

  test("hold-to-talk starts on press and ends on release", () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    render(<MonitorView status="live" onHoldStart={onHoldStart} onHoldEnd={onHoldEnd} />);

    const talk = screen.getByRole("button", { name: /hold to talk/i });
    fireEvent.pointerDown(talk);
    expect(onHoldStart).toHaveBeenCalledOnce();
    fireEvent.pointerUp(talk);
    expect(onHoldEnd).toHaveBeenCalledOnce();
  });
});
