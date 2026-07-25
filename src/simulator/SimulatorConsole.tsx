import { useState } from "react";
import type { Session } from "../session/session";
import type { DeviceSession } from "./device-session";
import type { SimDeviceState } from "./useSimulatedDevice";
import { useDeviceControlStream } from "./useDeviceControlStream";
import { useDeviceCall } from "./useDeviceCall";
import { DeviceStatusCard } from "./DeviceStatusCard";
import { BabyPairPanel } from "./BabyPairPanel";
import { CryPanel } from "./CryPanel";
import { PositionPanel } from "./PositionPanel";
import { SleepPanel } from "./SleepPanel";
import { TemperaturePanel } from "./TemperaturePanel";
import { FeedingPanel } from "./FeedingPanel";
import { CallPanel } from "./CallPanel";

// The claimed device's console: everything a real box does, as buttons.
export function SimulatorConsole({
  session,
  deviceSession,
  baseUrl,
  state,
  onPairBaby,
  onRePaired,
  onFactoryReset,
}: {
  session: Session;
  deviceSession: DeviceSession;
  baseUrl: string;
  state: SimDeviceState;
  onPairBaby: (babyId: string) => Promise<void>;
  onRePaired: (babyId: string) => void;
  onFactoryReset: () => void;
}) {
  const [autoAnswer, setAutoAnswer] = useState(true);

  const call = useDeviceCall({
    deviceSession,
    baseUrl,
    deviceId: state.deviceId,
    autoAnswer,
  });

  const streamStatus = useDeviceControlStream({
    deviceSession,
    baseUrl,
    enabled: state.phase === "active",
    onIncomingCall: call.handleIncomingCall,
    onRePair: onRePaired,
  });

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 px-[18px] pb-10 sm:grid-cols-2">
      <div className="flex flex-col gap-4">
        <DeviceStatusCard
          deviceSession={deviceSession}
          serial={state.serial}
          deviceId={state.deviceId}
          streamStatus={streamStatus}
          onFactoryReset={onFactoryReset}
        />
        <BabyPairPanel session={session} pairedBabyId={state.babyId} onPair={onPairBaby} />
        <CryPanel deviceSession={deviceSession} />
        <PositionPanel deviceSession={deviceSession} />
        <TemperaturePanel deviceSession={deviceSession} enabled={state.phase === "active"} />
      </div>
      <div className="flex flex-col gap-4">
        <CallPanel
          phase={call.phase}
          mediaError={call.mediaError}
          autoAnswer={autoAnswer}
          onAutoAnswerChange={setAutoAnswer}
          localVideoRef={call.localVideoRef}
          remoteAudioRef={call.remoteAudioRef}
          remoteVideoRef={call.remoteVideoRef}
          hasRemoteVideo={call.hasRemoteVideo}
          onAnswer={call.answerNow}
          onHangUp={call.hangUp}
          onCallCaregiver={call.callCaregiver}
        />
        <SleepPanel deviceSession={deviceSession} />
        <FeedingPanel deviceSession={deviceSession} />
      </div>
    </div>
  );
}
