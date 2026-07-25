import type { Session } from "../session/session";
import { useDevices } from "../devices/useDevices";
import { useSimulateCamera } from "../devices/useSimulateCamera";
import { MonitorView } from "./MonitorView";
import { useCall } from "./useCall";

// The Live Monitor tab — finds the device paired to the active baby and runs the
// 1-to-1 call (isolated video island). Shows an empty state when no monitor is
// paired to this baby.
export function MonitorScreen({
  session,
  baseUrl,
  babyId,
}: {
  session: Session;
  baseUrl: string;
  babyId?: string;
}) {
  const { devices } = useDevices(session);
  // More than one device can be paired to the same baby (pairing doesn't unpair
  // the previous box). Call the one that's actually alive: prefer an online
  // device (heartbeat-derived, ADR 0012) over a stale offline pairing.
  const paired = devices.filter((d) => d.babyId === babyId);
  const device = paired.find((d) => d.liveness === "online") ?? paired[0];
  const deviceId = device?.id;
  const call = useCall({ session, baseUrl, deviceId });
  const simulate = useSimulateCamera(session);

  if (!deviceId) {
    return <p className="text-[13.5px] text-ink-2">No monitor is paired to this baby yet.</p>;
  }

  return (
    <MonitorView
      videoRef={call.videoRef}
      audioRef={call.audioRef}
      status={call.status}
      talkState={call.talkState}
      hasVideo={call.hasVideo}
      micError={call.micError}
      onHoldStart={call.holdStart}
      onHoldEnd={call.holdEnd}
      // Device reported no physical camera (ADR 0010) → offer Simulate Camera.
      // Live video trumps the flag: the devices snapshot can be stale (a device
      // that just reported its camera), and hiding an actually-flowing feed
      // behind "No camera detected" is always wrong.
      cameraUnavailable={device?.cameraAvailable === false && !call.hasVideo}
      simulating={simulate.isPending}
      onSimulate={() => simulate.mutate(deviceId)}
      // Two-way video: parent camera preview + toggle (auto-on by default).
      selfVideoRef={call.selfVideoRef}
      cameraOn={call.cameraOn}
      cameraError={call.cameraError}
      onToggleCamera={call.toggleCamera}
    />
  );
}
