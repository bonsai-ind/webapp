import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "../session/session";
import type { DeviceSession } from "./device-session";
import { claimDevice, pairDevice } from "../devices/devices-api";
import { getDeviceSelf, registerDevice } from "./device-api";
import { resetSerial } from "./serial";

export const SIM_MODEL = "HUSH SIM";
export const SIM_FIRMWARE_VERSION = "sim-1.0.0";

// The simulated box's lifecycle, mirroring real firmware boot (ADR 0010):
// restore a persisted credential → active, else register by serial and show
// the Pairing Code until a caregiver claims it. The one deliberate divergence
// from hardware: the claim happens on this same page (the user is signed in
// here too), so the claim response's device tokens land directly in our
// device session — the token handoff a real box will need is a later phase.
export interface SimDeviceState {
  phase: "booting" | "unclaimed" | "active";
  serial: string;
  deviceId?: string;
  deviceName?: string;
  babyId?: string;
  pairingCode?: string;
  codeExpiresAt?: string;
  error?: string;
}

export function useSimulatedDevice({
  session,
  deviceSession,
  baseUrl,
  serial,
}: {
  session: Session;
  deviceSession: DeviceSession;
  baseUrl: string;
  serial: string;
}) {
  const [state, setState] = useState<SimDeviceState>({ phase: "booting", serial });

  const register = useCallback(async () => {
    try {
      const result = await registerDevice(baseUrl, {
        serialNumber: serial,
        model: SIM_MODEL,
        firmwareVersion: SIM_FIRMWARE_VERSION,
      });
      setState((s) => ({
        ...s,
        phase: "unclaimed",
        deviceId: result.deviceId,
        pairingCode: result.pairingCode,
        codeExpiresAt: result.expiresAt,
        error: undefined,
      }));
    } catch {
      setState((s) => ({ ...s, error: "Could not reach the backend to register. Is it running?" }));
    }
  }, [baseUrl, serial]);

  // Boot once (guarded against StrictMode's double effect run — a second
  // register would rotate the pairing code out from under the first).
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    void (async () => {
      if (await deviceSession.restore()) {
        try {
          const self = await getDeviceSelf(deviceSession);
          setState((s) => ({
            ...s,
            phase: "active",
            deviceId: self.id,
            deviceName: self.name,
            babyId: self.babyId ?? undefined,
          }));
          return;
        } catch {
          deviceSession.clear(); // credential worked but the device is gone — re-register
        }
      }
      await register();
    })();
  }, [deviceSession, register]);

  // Redeem the on-screen code as the signed-in caregiver; adopt the returned
  // device tokens so this page authenticates as the box from here on.
  const claim = useCallback(
    async (name: string) => {
      const code = state.pairingCode;
      if (!code) throw new Error("no pairing code");
      const claimed = await claimDevice(session, { pairingCode: code, name });
      deviceSession.adoptTokens(claimed.accessToken, claimed.refreshToken);
      setState((s) => ({
        ...s,
        phase: "active",
        deviceId: claimed.device.id,
        deviceName: claimed.device.name,
        babyId: claimed.device.babyId ?? undefined,
        pairingCode: undefined,
        codeExpiresAt: undefined,
        error: undefined,
      }));
    },
    [session, deviceSession, state.pairingCode],
  );

  const pairBaby = useCallback(
    async (babyId: string) => {
      if (!state.deviceId) return;
      await pairDevice(session, state.deviceId, babyId);
      setState((s) => ({ ...s, babyId }));
    },
    [session, state.deviceId],
  );

  // Applied when the control stream delivers a `re-pair` frame — the backend
  // is authoritative for pairing.
  const setBabyFromControl = useCallback((babyId: string) => {
    setState((s) => ({ ...s, babyId }));
  }, []);

  const factoryReset = useCallback(() => {
    deviceSession.clear();
    resetSerial();
    window.location.reload();
  }, [deviceSession]);

  return { state, claim, pairBaby, setBabyFromControl, reRegister: register, factoryReset };
}
