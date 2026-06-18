import { describe, expect, test } from "vitest";
import { validateBrandColor } from "./brand-color";

describe("validateBrandColor", () => {
  test("accepts the default indigo brand color", () => {
    expect(validateBrandColor("#6C5CE7")).toEqual({ ok: true });
  });

  test("rejects a red that could be confused with an active cry", () => {
    expect(validateBrandColor("#E03131")).toEqual({ ok: false, reason: "too-close-to-alert" });
  });

  test("rejects a green that could be confused with the calm state", () => {
    expect(validateBrandColor("#2FB36B")).toEqual({ ok: false, reason: "too-close-to-calm" });
  });

  test("accepts a warm amber brand outside the alert-red band", () => {
    // Amber (~36°) is a domain accent, not a safety color — orange brands are allowed.
    expect(validateBrandColor("#E08700")).toEqual({ ok: true });
  });

  test("rejects a malformed color string", () => {
    expect(validateBrandColor("not-a-color")).toEqual({ ok: false, reason: "invalid-color" });
  });

  test("accepts a near-gray brand whose hue would otherwise land in a forbidden band", () => {
    // #808080 has hue 0° (the alert band) but zero saturation — it reads as gray,
    // not red, so it cannot be confused with an active cry.
    expect(validateBrandColor("#808080")).toEqual({ ok: true });
  });
});
