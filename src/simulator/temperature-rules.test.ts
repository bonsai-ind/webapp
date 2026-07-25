import { describe, expect, test } from "vitest";
import { evaluate, type TemperatureAnomalyKind } from "./temperature-rules";

const none = new Set<TemperatureAnomalyKind>();
const activeSet = (...kinds: TemperatureAnomalyKind[]) => new Set(kinds);
const at = (celsius: number, minutesAgo = 0) => ({ celsius, at: 1_000_000_000 - minutesAgo * 60_000 });

describe("temperature rules (firmware contract)", () => {
  test("room too_hot opens at 23.0 and clears below 22.5 (hysteresis)", () => {
    expect(evaluate("room", at(23.0), [], none).open).toContain("too_hot");
    expect(evaluate("room", at(22.9), [], none).open).toHaveLength(0);
    // Between clear and open thresholds an ACTIVE alert stays active.
    expect(evaluate("room", at(22.7), [], activeSet("too_hot")).close).toHaveLength(0);
    expect(evaluate("room", at(22.4), [], activeSet("too_hot")).close).toContain("too_hot");
  });

  test("room too_cold opens at 16.0 and clears above 16.5", () => {
    expect(evaluate("room", at(16.0), [], none).open).toContain("too_cold");
    expect(evaluate("room", at(16.6), [], activeSet("too_cold")).close).toContain("too_cold");
    expect(evaluate("room", at(16.3), [], activeSet("too_cold")).close).toHaveLength(0);
  });

  test("rapid_rise opens on a ≥2°C climb within 15 minutes that exceeds the safe band", () => {
    const history = [at(20.5, 10), at(21.0, 7), at(21.8, 4)];
    expect(evaluate("room", at(22.6), history, none).open).toContain("rapid_rise");
    // The same climb spread over MORE than 15 min doesn't trigger.
    expect(evaluate("room", at(22.6), [at(20.0, 20)], none).open).not.toContain("rapid_rise");
  });

  test("rapid_rise does NOT open while recovering from a cold room (still below safe band)", () => {
    // 14 → 18.7 is a fast rise but plain recovery toward 21°C.
    expect(evaluate("room", at(18.7), [at(14.0, 10)], none).open).not.toContain("rapid_rise");
    // An active rapid_rise clears once the room drops back into the safe band.
    expect(evaluate("room", at(21.9), [at(21.5, 5)], activeSet("rapid_rise")).close).toContain("rapid_rise");
  });

  test("sensor_fault preempts comfort alerts and clears on a plausible reading", () => {
    const r = evaluate("room", at(99), [], none);
    expect(r.open).toEqual(["sensor_fault"]);
    expect(evaluate("room", at(21), [], activeSet("sensor_fault")).close).toContain("sensor_fault");
  });

  test("body fever opens at 38.0, clears below 37.6", () => {
    expect(evaluate("body", at(38.0), [], none).open).toContain("fever");
    expect(evaluate("body", at(37.8), [], activeSet("fever")).close).toHaveLength(0);
    expect(evaluate("body", at(37.5), [], activeSet("fever")).close).toContain("fever");
  });

  test("body hypothermia opens at 36.0, clears above 36.3", () => {
    expect(evaluate("body", at(36.0), [], none).open).toContain("hypothermia");
    expect(evaluate("body", at(36.4), [], activeSet("hypothermia")).close).toContain("hypothermia");
  });

  test("normal readings open nothing", () => {
    expect(evaluate("room", at(21.0), [at(20.8, 5)], none)).toEqual({ open: [], close: [] });
    expect(evaluate("body", at(37.0), [], none)).toEqual({ open: [], close: [] });
  });

  test("an already-active kind is not re-opened", () => {
    expect(evaluate("room", at(24.0), [], activeSet("too_hot")).open).toHaveLength(0);
  });
});
