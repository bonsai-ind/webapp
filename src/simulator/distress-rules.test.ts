import { describe, expect, test } from "vitest";
import { alertLevelOf, decide, evaluate, type DistressCue } from "./distress-rules";

describe("distress rules (firmware contract)", () => {
  test("nothing / only self-regulation cues stay calm — coping is not distress", () => {
    expect(evaluate([]).level).toBe("calm");
    expect(evaluate(["gaze_aversion", "hand_to_mouth", "tuck_flexed"]).level).toBe("calm");
  });

  test("a single concern cue is only fussing (cluster over single-cue)", () => {
    expect(evaluate(["brow_bulge"]).level).toBe("fussing");
    expect(evaluate(["legs_to_chest"]).level).toBe("fussing");
  });

  test("two-plus overstimulation cues across channels = stress (amber tier)", () => {
    expect(evaluate(["finger_splay", "arching_intermittent"]).level).toBe("stress");
    expect(evaluate(["airplane_arms", "brow_bulge"]).level).toBe("stress");
  });

  test("NFCS core cluster + flexor guarding = distress (red tier)", () => {
    expect(evaluate(["brow_bulge", "eye_squeeze", "legs_to_chest"]).level).toBe("distress");
    // Core cluster WITHOUT body guarding is not yet distress.
    expect(evaluate(["brow_bulge", "eye_squeeze"]).level).toBe("stress");
    // One core AU + flexor is not the pain cluster.
    expect(evaluate(["brow_bulge", "legs_to_chest"]).level).toBe("stress");
  });

  test("any emergency cue short-circuits to emergency", () => {
    for (const cue of ["face_covered", "seizure_like", "sustained_arching", "apnea_stillness", "dusky_color"] as DistressCue[]) {
      expect(evaluate([cue]).level).toBe("emergency");
    }
  });

  test("autoCall fires ONLY for a covered face (user choice), not other emergencies", () => {
    expect(evaluate(["face_covered"]).autoCall).toBe(true);
    expect(evaluate(["seizure_like"]).autoCall).toBe(false);
    expect(evaluate(["sustained_arching"]).autoCall).toBe(false);
    // Covered face wins even alongside other cues.
    expect(evaluate(["brow_bulge", "face_covered"]).autoCall).toBe(true);
  });

  test("primaryCue prioritises the most urgent signal for the caregiver copy", () => {
    expect(evaluate(["brow_bulge", "face_covered"]).primaryCue).toBe("face_covered");
    expect(evaluate(["arching_intermittent", "brow_bulge"]).primaryCue).toBe("brow_bulge");
  });

  test("inconsolability: a sustained state escalates one tier", () => {
    expect(evaluate(["brow_bulge"], { sustainedTicks: 2 }).level).toBe("stress"); // fussing → stress
    expect(evaluate(["finger_splay", "arching_intermittent"], { sustainedTicks: 2 }).level).toBe("distress"); // stress → distress
    // Emergency is unaffected by the duration gate (already the ceiling).
    expect(evaluate(["face_covered"], { sustainedTicks: 5 }).level).toBe("emergency");
  });

  test("a sleeping baby's minor cues are suppressed at the mild tier only", () => {
    expect(evaluate(["brow_bulge"], { asleep: true }).level).toBe("calm"); // fussing suppressed
    // Stress+ and emergency are never suppressed.
    expect(evaluate(["finger_splay", "arching_intermittent"], { asleep: true }).level).toBe("stress");
    expect(evaluate(["face_covered"], { asleep: true }).level).toBe("emergency");
  });
});

describe("episode decision (open / change / clear)", () => {
  test("calm and fussing never open an episode", () => {
    expect(alertLevelOf("calm")).toBeNull();
    expect(alertLevelOf("fussing")).toBeNull();
    expect(decide(null, "fussing")).toEqual({ kind: "none" });
  });

  test("a first alert opens; the same level again is a no-op", () => {
    expect(decide(null, "stress")).toEqual({ kind: "set", level: "stress" });
    expect(decide({ level: "stress" }, "stress")).toEqual({ kind: "none" });
  });

  test("a level change opens a fresh episode (close old + open new → re-notify)", () => {
    expect(decide({ level: "stress" }, "distress")).toEqual({ kind: "set", level: "distress" });
    expect(decide({ level: "distress" }, "emergency")).toEqual({ kind: "set", level: "emergency" });
    // De-escalation also re-opens at the lower tier.
    expect(decide({ level: "distress" }, "stress")).toEqual({ kind: "set", level: "stress" });
  });

  test("dropping to calm/fussing clears an active episode", () => {
    expect(decide({ level: "distress" }, "calm")).toEqual({ kind: "clear" });
    expect(decide({ level: "stress" }, "fussing")).toEqual({ kind: "clear" });
    expect(decide(null, "calm")).toEqual({ kind: "none" });
  });
});
