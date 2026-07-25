import { describe, expect, test } from "vitest";
import {
  distressAlertsReducer,
  distressAlertText,
  initialDistressAlerts,
  isAutoCall,
  severity,
  type DistressEpisode,
} from "./distress-status";

const ep = (id: string, level: DistressEpisode["level"], over: Partial<DistressEpisode> = {}): DistressEpisode => ({
  id,
  babyId: "bby_1",
  babyName: "Mia",
  level,
  cues: [],
  startedAt: 1000,
  ...over,
});

describe("distress alerts reducer", () => {
  test("distress + emergency are danger; stress is a warning", () => {
    expect(severity("distress")).toBe("danger");
    expect(severity("emergency")).toBe("danger");
    expect(severity("stress")).toBe("warning");
  });

  test("an alert opens; its clear closes only that episode", () => {
    let state = distressAlertsReducer(initialDistressAlerts, { kind: "alert", episode: ep("d1", "distress") });
    state = distressAlertsReducer(state, { kind: "alert", episode: ep("d2", "stress") });

    expect(state.danger?.id).toBe("d1");
    expect(state.warnings.map((w) => w.id)).toEqual(["d2"]);

    state = distressAlertsReducer(state, { kind: "clear", episodeId: "d1" });
    expect(state.danger).toBeUndefined();
    expect(state.warnings.map((w) => w.id)).toEqual(["d2"]); // stress warning survives
  });

  test("most recent danger wins; an earlier one takes back over on clear", () => {
    let state = distressAlertsReducer(initialDistressAlerts, { kind: "alert", episode: ep("d1", "distress") });
    state = distressAlertsReducer(state, { kind: "alert", episode: ep("d2", "emergency", { cues: ["face_covered"] }) });
    expect(state.danger?.id).toBe("d2");

    state = distressAlertsReducer(state, { kind: "clear", episodeId: "d2" });
    expect(state.danger?.id).toBe("d1");
  });

  test("a replayed alert keeps its original start time", () => {
    let state = distressAlertsReducer(initialDistressAlerts, { kind: "alert", episode: ep("d1", "distress", { startedAt: 500 }) });
    state = distressAlertsReducer(state, { kind: "alert", episode: ep("d1", "distress", { startedAt: 9000 }) });
    expect(state.episodes).toHaveLength(1);
    expect(state.danger?.startedAt).toBe(500);
  });

  test("only a covered-face emergency counts as an auto-call", () => {
    expect(isAutoCall(ep("d1", "emergency", { cues: ["face_covered"] }))).toBe(true);
    expect(isAutoCall(ep("d2", "emergency", { cues: ["seizure_like"] }))).toBe(false);
    expect(isAutoCall(ep("d3", "distress", { cues: ["face_covered"] }))).toBe(false);
  });

  test("copy is level- and cue-specific", () => {
    expect(distressAlertText(ep("d1", "emergency", { cues: ["face_covered"] })).title).toMatch(/face may be covered/i);
    expect(distressAlertText(ep("d2", "distress")).title).toMatch(/in distress/i);
    expect(distressAlertText(ep("d3", "stress")).title).toMatch(/stressed/i);
  });
});
