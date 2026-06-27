import type { Session } from "../session/session";
import { useDevices } from "../devices/useDevices";
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
  const deviceId = devices.find((d) => d.babyId === babyId)?.id;
  const call = useCall({ session, baseUrl, deviceId });

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
    />
  );
}
