import { describe, expect, test } from "vitest";
import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { CallPanel } from "./CallPanel";
import type { CallPhase } from "./call-state";

function renderPanel(props: { phase: CallPhase; hasRemoteVideo?: boolean }) {
  return render(
    <CallPanel
      mediaError={false}
      autoAnswer
      onAutoAnswerChange={() => {}}
      localVideoRef={createRef<HTMLVideoElement>()}
      remoteAudioRef={createRef<HTMLAudioElement>()}
      remoteVideoRef={createRef<HTMLVideoElement>()}
      onAnswer={() => {}}
      onHangUp={() => {}}
      onCallCaregiver={async () => {}}
      {...props}
    />,
  );
}

describe("CallPanel — two-way video (device screen)", () => {
  test("live with parent video: parent feed fills the screen, own camera shrinks to PiP", () => {
    renderPanel({ phase: "live", hasRemoteVideo: true });

    expect(screen.getByTestId("parent-video")).not.toHaveClass("hidden");
    expect(screen.getByTestId("device-camera")).toHaveClass("absolute");
    expect(screen.queryByText(/parent camera is off/i)).not.toBeInTheDocument();
  });

  test("live without parent video: own preview stays main, caption explains", () => {
    renderPanel({ phase: "live", hasRemoteVideo: false });

    expect(screen.getByTestId("parent-video")).toHaveClass("hidden");
    expect(screen.getByTestId("device-camera")).not.toHaveClass("absolute");
    expect(screen.getByText(/parent camera is off/i)).toBeInTheDocument();
  });

  test("idle: placeholder text, no parent-camera caption", () => {
    renderPanel({ phase: "idle" });

    expect(screen.getByText(/camera preview appears during a call/i)).toBeInTheDocument();
    expect(screen.queryByText(/parent camera is off/i)).not.toBeInTheDocument();
  });
});
