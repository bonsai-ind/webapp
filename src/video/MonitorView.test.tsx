import { createRef } from "react";
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MonitorView } from "./MonitorView";
import type { TalkState } from "./useCall";

function renderView(
  overrides: Partial<{
    status: "connecting" | "live" | "ended";
    talkState: TalkState;
    hasVideo: boolean;
    micError: boolean;
    onHoldStart: () => void;
    onHoldEnd: () => void;
  }> = {},
) {
  const props = {
    status: "live" as const,
    talkState: "idle" as TalkState,
    hasVideo: true,
    micError: false,
    onHoldStart: () => {},
    onHoldEnd: () => {},
    ...overrides,
  };
  return render(
    <MonitorView
      videoRef={createRef<HTMLVideoElement>()}
      audioRef={createRef<HTMLAudioElement>()}
      {...props}
    />,
  );
}

describe("MonitorView", () => {
  test("reflects the connection status", () => {
    const { rerender } = renderView({ status: "connecting" });
    expect(screen.getByText(/connecting/i)).toBeInTheDocument();

    rerender(
      <MonitorView
        videoRef={createRef<HTMLVideoElement>()}
        audioRef={createRef<HTMLAudioElement>()}
        status="live"
        talkState="idle"
        hasVideo
        micError={false}
        onHoldStart={() => {}}
        onHoldEnd={() => {}}
      />,
    );
    expect(screen.getByText(/^live$/i)).toBeInTheDocument();
  });

  test("hold-to-talk starts on press and ends on release", () => {
    const onHoldStart = vi.fn();
    const onHoldEnd = vi.fn();
    renderView({ onHoldStart, onHoldEnd });

    const talk = screen.getByRole("button", { name: /hold to talk/i });
    fireEvent.pointerDown(talk);
    expect(onHoldStart).toHaveBeenCalledOnce();
    fireEvent.pointerUp(talk);
    expect(onHoldEnd).toHaveBeenCalledOnce();
  });

  test("the talk button label reflects talkState", () => {
    const { rerender } = renderView({ talkState: "idle" });
    expect(screen.getByRole("button", { name: /hold to talk/i })).toBeInTheDocument();

    const rerenderWith = (talkState: TalkState) =>
      rerender(
        <MonitorView
          videoRef={createRef<HTMLVideoElement>()}
          audioRef={createRef<HTMLAudioElement>()}
          status="live"
          talkState={talkState}
          hasVideo
          micError={false}
          onHoldStart={() => {}}
          onHoldEnd={() => {}}
        />,
      );

    rerenderWith("activating");
    expect(screen.getByRole("button", { name: /mic activating/i })).toBeInTheDocument();

    rerenderWith("talking");
    expect(screen.getByRole("button", { name: /talking/i })).toBeInTheDocument();
  });

  test("shows the audio-only placeholder when there is no video", () => {
    renderView({ hasVideo: false });
    expect(screen.getByText(/audio only/i)).toBeInTheDocument();
  });

  test("hides the audio-only placeholder once video arrives", () => {
    renderView({ hasVideo: true });
    expect(screen.queryByText(/audio only/i)).not.toBeInTheDocument();
  });

  test("shows a mic error banner when micError is set", () => {
    renderView({ micError: true });
    expect(screen.getByText(/microphone unavailable/i)).toBeInTheDocument();
  });
});
