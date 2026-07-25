// Device-side temperature anomaly rules — THE FIRMWARE CONTRACT. The device
// owns the boundary (like cry/position detection): it evaluates every reading
// against these research-backed thresholds and opens/closes alert episodes;
// the backend only stores and relays.
//
// Room (safe sleep 20–22.2°C; overheating is a SIDS risk factor; <16°C too
// cold — AAP / Sleep Foundation / Lullaby Trust):
//   too_hot     open ≥23.0°C, clear <22.5°C (hysteresis so it doesn't flap)
//   too_cold    open ≤16.0°C, clear >16.5°C
//   rapid_rise  ≥2.0°C rise within 15 minutes (heater fault / fire risk),
//               clears when the 15-min rise falls below 1.0°C
//   sensor_fault reading outside −10…55°C (implausible for a nursery)
// Body (normal 36.5–37.5°C — AAP/WHO; fever ≥38°C; hypothermia ≤36°C — Merck):
//   fever        open ≥38.0°C, clear <37.6°C
//   hypothermia  open ≤36.0°C, clear >36.3°C
//   sensor_fault reading outside 30…43°C

export type TemperatureSensor = "room" | "body";

export type TemperatureAnomalyKind =
  | "too_hot"
  | "too_cold"
  | "rapid_rise"
  | "sensor_fault"
  | "fever"
  | "hypothermia";

export interface TemperatureReading {
  celsius: number;
  at: number; // epoch ms
}

const RAPID_RISE_WINDOW_MS = 15 * 60_000;

export const THRESHOLDS = {
  room: {
    tooHotOpen: 23.0,
    tooHotClear: 22.5,
    tooColdOpen: 16.0,
    tooColdClear: 16.5,
    rapidRiseOpen: 2.0,
    rapidRiseClear: 1.0,
    faultLow: -10,
    faultHigh: 55,
  },
  body: {
    feverOpen: 38.0,
    feverClear: 37.6,
    hypothermiaOpen: 36.0,
    hypothermiaClear: 36.3,
    faultLow: 30,
    faultHigh: 43,
  },
} as const;

export interface RulesResult {
  open: TemperatureAnomalyKind[];
  close: TemperatureAnomalyKind[];
}

// evaluate decides which anomaly kinds should newly OPEN and which active ones
// should CLOSE, given the latest reading, the recent history (for rapid-rise;
// same sensor, any order) and the kinds currently active. Pure — trivially
// portable to firmware.
export function evaluate(
  sensor: TemperatureSensor,
  reading: TemperatureReading,
  history: TemperatureReading[],
  active: Set<TemperatureAnomalyKind>,
): RulesResult {
  const open: TemperatureAnomalyKind[] = [];
  const close: TemperatureAnomalyKind[] = [];
  const want = (kind: TemperatureAnomalyKind, shouldBeActive: boolean, clearCondition: boolean) => {
    if (shouldBeActive && !active.has(kind)) open.push(kind);
    if (!shouldBeActive && active.has(kind) && clearCondition) close.push(kind);
  };
  const c = reading.celsius;

  if (sensor === "room") {
    const t = THRESHOLDS.room;
    const fault = c < t.faultLow || c > t.faultHigh;
    want("sensor_fault", fault, !fault);
    if (fault) {
      // An implausible reading must not also open/close comfort alerts.
      return { open, close };
    }
    want("too_hot", c >= t.tooHotOpen, c < t.tooHotClear);
    want("too_cold", c <= t.tooColdOpen, c > t.tooColdClear);

    const windowStart = reading.at - RAPID_RISE_WINDOW_MS;
    const inWindow = history.filter((h) => h.at >= windowStart && h.at <= reading.at);
    const rise = inWindow.length > 0 ? c - Math.min(...inWindow.map((h) => h.celsius)) : 0;
    // A fast rise is only dangerous when it carries the room ABOVE the safe
    // band — warming back up from a too-cold room toward 21°C is recovery,
    // not a heater fault.
    want("rapid_rise", rise >= t.rapidRiseOpen && c > 22.2, rise < t.rapidRiseClear || c <= 22.2);
    return { open, close };
  }

  const t = THRESHOLDS.body;
  const fault = c < t.faultLow || c > t.faultHigh;
  want("sensor_fault", fault, !fault);
  if (fault) return { open, close };
  want("fever", c >= t.feverOpen, c < t.feverClear);
  want("hypothermia", c <= t.hypothermiaOpen, c > t.hypothermiaClear);
  return { open, close };
}
