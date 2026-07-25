import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceSession } from "./device-session";
import { reportTemperature, reportTemperatureAlert } from "./device-api";
import {
  evaluate,
  type TemperatureAnomalyKind,
  type TemperatureReading,
  type TemperatureSensor,
} from "./temperature-rules";

// Real-device cadence: one automatic reading per hour (a nursery's ambient
// temperature moves slowly). "Send now" pushes a reading immediately — that is
// how demos and threshold changes are exercised.
const TICK_MS = 60 * 60_000;
// Exponential approach toward the target per tick — organic like a real room,
// but big jumps (a 99° sensor-fault preset) still land within a couple ticks.
const DRIFT_FACTOR = 0.6;

export interface SensorSim {
  current: number;
  target: number;
  active: Partial<Record<TemperatureAnomalyKind, string>>; // kind -> open episodeId
}

// The simulated temperature firmware: every 20s per enabled sensor it posts the
// current reading, runs the on-device rules (temperature-rules.ts) over the
// recent history, and opens/closes anomaly episodes exactly like real firmware
// will. UI buttons only set the TARGET value; everything else is the engine.
export function useTemperatureLoop({
  deviceSession,
  enabled,
  bodySensorOn,
}: {
  deviceSession: DeviceSession;
  enabled: boolean;
  bodySensorOn: boolean;
}) {
  const [room, setRoom] = useState<SensorSim>({ current: 21.0, target: 21.0, active: {} });
  const [body, setBody] = useState<SensorSim>({ current: 37.0, target: 37.0, active: {} });
  const historyRef = useRef<Record<TemperatureSensor, TemperatureReading[]>>({ room: [], body: [] });
  const bodyOnRef = useRef(bodySensorOn);
  bodyOnRef.current = bodySensorOn;

  // Refs mirror state so the interval closure always sees the latest values.
  const roomRef = useRef(room);
  roomRef.current = room;
  const bodyRef = useRef(body);
  bodyRef.current = body;

  const tickSensor = async (sensor: TemperatureSensor, sim: SensorSim): Promise<SensorSim> => {
      // Drift toward target with a little jitter (rounded to 0.1°C).
      const delta = sim.target - sim.current;
      const step = Math.abs(delta) < 0.2 ? delta : delta * DRIFT_FACTOR;
      const celsius = Math.round((sim.current + step + (Math.random() - 0.5) * 0.1) * 10) / 10;
      const reading: TemperatureReading = { celsius, at: Date.now() };

      await reportTemperature(deviceSession, { sensor, celsius }).catch(() => {});

      const history = historyRef.current[sensor];
      const { open, close } = evaluate(sensor, reading, history, new Set(Object.keys(sim.active) as TemperatureAnomalyKind[]));
      history.push(reading);
      // Keep ~16 min of history for the rapid-rise window.
      historyRef.current[sensor] = history.filter((h) => h.at >= reading.at - 16 * 60_000);

      const active = { ...sim.active };
      for (const kind of open) {
        const episodeId = `tep_sim_${crypto.randomUUID()}`;
        active[kind] = episodeId;
        await reportTemperatureAlert(deviceSession, { episodeId, sensor, kind, state: "alert", celsius }).catch(() => {});
      }
      for (const kind of close) {
        const episodeId = active[kind];
        if (!episodeId) continue;
        delete active[kind];
        await reportTemperatureAlert(deviceSession, { episodeId, sensor, kind, state: "clear", celsius }).catch(() => {});
      }
      return { ...sim, current: celsius, active };
  };

  // Stable across renders (reads live values via refs) so both the hourly
  // interval and the manual "Send now" button drive the same firmware tick.
  const sendNow = useCallback(async () => {
    setRoom(await tickSensor("room", roomRef.current));
    if (bodyOnRef.current) setBody(await tickSensor("body", bodyRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceSession]);

  useEffect(() => {
    if (!enabled) return;
    void sendNow(); // one reading at boot, then hourly
    const timer = setInterval(() => void sendNow(), TICK_MS);
    return () => clearInterval(timer);
  }, [enabled, sendNow]);

  return {
    room,
    body,
    sendNow,
    setRoomTarget: (target: number) => setRoom((s) => ({ ...s, target })),
    setBodyTarget: (target: number) => setBody((s) => ({ ...s, target })),
  };
}
