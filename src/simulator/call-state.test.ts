import { describe, expect, test } from "vitest";
import { transition } from "./call-state";

const AUTO = { autoAnswer: true };
const MANUAL = { autoAnswer: false };

describe("simulator call-state transitions", () => {
  test("idle + start → ringing with the full answer flow", () => {
    expect(transition("idle", "start", AUTO)).toEqual({
      phase: "ringing",
      answer: true,
      resendReady: false,
      teardown: false,
    });
  });

  test("idle + incoming-call answers when auto-answer is on", () => {
    expect(transition("idle", "incoming-call", AUTO).answer).toBe(true);
  });

  test("idle + incoming-call is ignored when auto-answer is off", () => {
    expect(transition("idle", "incoming-call", MANUAL)).toEqual({
      phase: "idle",
      answer: false,
      resendReady: false,
      teardown: false,
    });
  });

  test("incoming-call while ringing re-sends ready instead of restarting", () => {
    expect(transition("ringing", "incoming-call", AUTO)).toEqual({
      phase: "ringing",
      answer: false,
      resendReady: true,
      teardown: false,
    });
  });

  test("incoming-call during a live call is ignored", () => {
    expect(transition("live", "incoming-call", AUTO)).toEqual({
      phase: "live",
      answer: false,
      resendReady: false,
      teardown: false,
    });
  });

  test("ringing + connected → live", () => {
    expect(transition("ringing", "connected", AUTO).phase).toBe("live");
  });

  test("ringing + timeout tears down back to idle", () => {
    expect(transition("ringing", "timeout", AUTO)).toEqual({
      phase: "idle",
      answer: false,
      resendReady: false,
      teardown: true,
    });
  });

  test("live + disconnected tears down to ended", () => {
    expect(transition("live", "disconnected", AUTO)).toEqual({
      phase: "ended",
      answer: false,
      resendReady: false,
      teardown: true,
    });
  });

  test("hangup from any active phase tears down to idle", () => {
    for (const phase of ["ringing", "live", "ended"] as const) {
      expect(transition(phase, "hangup", AUTO)).toEqual({
        phase: "idle",
        answer: false,
        resendReady: false,
        teardown: true,
      });
    }
  });

  test("ended + start answers again (a finished call can restart)", () => {
    expect(transition("ended", "start", AUTO).answer).toBe(true);
  });
});
