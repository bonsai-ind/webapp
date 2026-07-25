import { useEffect } from "react";
import type { DeviceSession } from "./device-session";
import { sendHeartbeat } from "./device-api";
import { SIM_FIRMWARE_VERSION } from "./useSimulatedDevice";

const INTERVAL_MS = 30_000;

// Periodic liveness heartbeat (ADR 0012), like real firmware: one immediately
// on enable (so the device flips online without waiting a cycle), then every
// 30s with lightly jittered vitals. Failures are ignored — the next beat heals.
export function useHeartbeatLoop({
  deviceSession,
  enabled,
}: {
  deviceSession: DeviceSession;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;
    const beat = () =>
      void sendHeartbeat(deviceSession, {
        cpu: jitter(0.35),
        memory: jitter(0.5),
        storage: jitter(0.2),
        network: "wifi",
        version: SIM_FIRMWARE_VERSION,
      }).catch(() => {});
    beat();
    const timer = setInterval(beat, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [deviceSession, enabled]);
}

function jitter(base: number): number {
  return Math.round((base + (Math.random() - 0.5) * 0.1) * 100) / 100;
}
