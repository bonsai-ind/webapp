import { useMemo } from "react";
import type { Session } from "../session/session";
import { createDeviceSession } from "./device-session";
import { getOrCreateSerial } from "./serial";
import { useSimulatedDevice } from "./useSimulatedDevice";
import { DeviceBootScreen } from "./DeviceBootScreen";
import { SimulatorConsole } from "./SimulatorConsole";

// Standalone Device Simulator (?simulator=1): this whole page IS the device.
// It talks the device plane with its own device session; the signed-in user
// session is used only for the human actions a caregiver performs (claim,
// pair, list babies) — the same split real firmware will have.
export function SimulatorApp({ session, baseUrl }: { session: Session; baseUrl: string }) {
  const serial = useMemo(() => getOrCreateSerial(), []);
  const deviceSession = useMemo(() => createDeviceSession({ baseUrl, serial }), [baseUrl, serial]);
  const device = useSimulatedDevice({ session, deviceSession, baseUrl, serial });

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-[18px] py-5">
        <div className="flex flex-col">
          <h1 className="text-[19px] font-extrabold tracking-[-0.03em] text-ink">Device Simulator</h1>
          <p className="text-[11.5px] text-ink-3">
            This page acts as a Hush device — it talks only the device APIs real firmware uses.
          </p>
        </div>
        <span className="font-mono text-[11px] text-ink-3">{device.state.serial}</span>
      </header>

      {device.state.phase === "active" ? (
        <SimulatorConsole
          session={session}
          deviceSession={deviceSession}
          baseUrl={baseUrl}
          state={device.state}
          onPairBaby={device.pairBaby}
          onRePaired={device.setBabyFromControl}
          onFactoryReset={device.factoryReset}
        />
      ) : (
        <DeviceBootScreen state={device.state} onClaim={device.claim} onReRegister={device.reRegister} />
      )}
    </div>
  );
}
