import { describe, expect, test } from "vitest";
import {
  initialTemperatureAlerts,
  severity,
  temperatureAlertsReducer,
  type TemperatureEpisode,
} from "./temperature-status";

const ep = (id: string, kind: string, over: Partial<TemperatureEpisode> = {}): TemperatureEpisode => ({
  id,
  babyId: "bby_1",
  babyName: "Mia",
  sensor: "room",
  kind,
  celsius: 24.1,
  startedAt: 1000,
  ...over,
});

describe("temperature alerts reducer", () => {
  test("danger kinds drive the takeover; warning kinds the banner", () => {
    expect(severity("too_hot")).toBe("danger");
    expect(severity("rapid_rise")).toBe("danger");
    expect(severity("fever")).toBe("danger");
    expect(severity("hypothermia")).toBe("danger");
    expect(severity("too_cold")).toBe("warning");
    expect(severity("sensor_fault")).toBe("warning");
  });

  test("an alert opens; its clear closes only that episode", () => {
    let state = temperatureAlertsReducer(initialTemperatureAlerts, { kind: "alert", episode: ep("t1", "too_hot") });
    state = temperatureAlertsReducer(state, { kind: "alert", episode: ep("t2", "too_cold") });

    expect(state.danger?.id).toBe("t1");
    expect(state.warnings.map((w) => w.id)).toEqual(["t2"]);

    state = temperatureAlertsReducer(state, { kind: "clear", episodeId: "t1" });
    expect(state.danger).toBeUndefined();
    expect(state.warnings.map((w) => w.id)).toEqual(["t2"]); // cold warning survives
  });

  test("most recent danger episode wins the takeover", () => {
    let state = temperatureAlertsReducer(initialTemperatureAlerts, { kind: "alert", episode: ep("t1", "too_hot") });
    state = temperatureAlertsReducer(state, { kind: "alert", episode: ep("t2", "fever", { sensor: "body", celsius: 38.5 }) });
    expect(state.danger?.id).toBe("t2");

    state = temperatureAlertsReducer(state, { kind: "clear", episodeId: "t2" });
    expect(state.danger?.id).toBe("t1"); // earlier danger takes back over
  });

  test("a replayed alert keeps its original start time", () => {
    let state = temperatureAlertsReducer(initialTemperatureAlerts, { kind: "alert", episode: ep("t1", "too_hot", { startedAt: 500 }) });
    state = temperatureAlertsReducer(state, { kind: "alert", episode: ep("t1", "too_hot", { startedAt: 9000 }) });
    expect(state.episodes).toHaveLength(1);
    expect(state.danger?.startedAt).toBe(500);
  });
});
