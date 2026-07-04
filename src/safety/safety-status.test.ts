import { describe, expect, test } from "vitest";
import { safetyStatusReducer, initialSafetyStatus } from "./safety-status";

describe("safetyStatusReducer", () => {
  test("an alert sets status and carries the episode", () => {
    const s = safetyStatusReducer(initialSafetyStatus, {
      kind: "alert",
      episodeId: "pos-1",
      babyName: "Mia",
      posture: "occluded",
    });
    expect(s.status).toBe("alert");
    expect(s.episode).toMatchObject({ id: "pos-1", babyName: "Mia", posture: "occluded" });
  });

  test("a clear resets to safe and drops the episode", () => {
    const alert = safetyStatusReducer(initialSafetyStatus, {
      kind: "alert",
      episodeId: "pos-1",
      babyName: "Mia",
      posture: "occluded",
    });
    const cleared = safetyStatusReducer(alert, { kind: "clear" });
    expect(cleared.status).toBe("safe");
    expect(cleared.episode).toBeUndefined();
  });

  test("an unknown event leaves state unchanged", () => {
    const alert = safetyStatusReducer(initialSafetyStatus, {
      kind: "alert",
      episodeId: "pos-1",
      babyName: "Mia",
      posture: "occluded",
    });
    // @ts-expect-error — an unrecognized event kind must be ignored
    const next = safetyStatusReducer(alert, { kind: "bogus" });
    expect(next).toBe(alert);
  });
});
