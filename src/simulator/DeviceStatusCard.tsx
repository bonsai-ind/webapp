import { useEffect, useState } from "react";
import { Panel } from "./Panel";
import { StatusPill } from "../ui/StatusPill";
import { Segmented } from "../ui/Segmented";
import { secondaryButtonClass } from "../ui/forms";
import type { DeviceSession } from "./device-session";
import type { ControlStreamStatus } from "./useDeviceControlStream";
import { reportCameraStatus } from "./device-api";
import { useHeartbeatLoop } from "./useHeartbeatLoop";

type CameraSource = "camera" | "demo" | "none";

// Device vitals + hardware toggles: heartbeat loop (liveness, ADR 0012) and
// camera presence/source (ADR 0010's camera-status), plus the control-stream
// connection pill and factory reset.
export function DeviceStatusCard({
  deviceSession,
  serial,
  deviceId,
  streamStatus,
  onFactoryReset,
}: {
  deviceSession: DeviceSession;
  serial: string;
  deviceId?: string;
  streamStatus: ControlStreamStatus;
  onFactoryReset: () => void;
}) {
  const [heartbeatOn, setHeartbeatOn] = useState(true);
  const [cameraSource, setCameraSource] = useState<CameraSource>("camera");
  useHeartbeatLoop({ deviceSession, enabled: heartbeatOn });

  // Report camera presence like real firmware would on boot and on change.
  useEffect(() => {
    void reportCameraStatus(deviceSession, {
      available: cameraSource === "camera",
      source: cameraSource,
    }).catch(() => {});
  }, [deviceSession, cameraSource]);

  return (
    <Panel title="Device">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-mono text-[12px] text-ink">{serial}</span>
          {deviceId && <span className="font-mono text-[10px] text-ink-3">{deviceId}</span>}
        </div>
        <StatusPill
          tone={streamStatus === "connected" ? "calm" : "neutral"}
          label={
            streamStatus === "connected"
              ? "Control stream on"
              : streamStatus === "reconnecting"
                ? "Reconnecting…"
                : "Connecting…"
          }
        />
      </div>

      <label className="flex items-center justify-between text-[13px] font-semibold text-ink-2">
        Heartbeat every 30s
        <input
          type="checkbox"
          checked={heartbeatOn}
          onChange={(e) => setHeartbeatOn(e.target.checked)}
          className="size-5 accent-(--primary)"
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[12.5px] text-ink-2">Camera source</span>
        <Segmented options={["camera", "demo", "none"]} value={cameraSource} onChange={setCameraSource} />
      </div>

      <button type="button" className={secondaryButtonClass} onClick={onFactoryReset}>
        Factory reset (new serial)
      </button>
    </Panel>
  );
}
