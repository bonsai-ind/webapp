import { useEffect, useState } from "react";
import type { LiveSync } from "../realtime/live-sync";
import {
  cameraStatusReducer,
  initialCameraStatus,
  type CameraStatus,
  type CameraStatusEvent,
} from "./camera-status";

interface CameraStatusData {
  available: boolean;
  deviceId?: string;
  source?: string;
}

function toEvent(data: CameraStatusData): CameraStatusEvent {
  return data.available ? { kind: "available" } : { kind: "unavailable" };
}

// Applies the camera state machine to `camera-status` frames on the user-scoped
// Live-sync stream, so the Monitor can offer Simulate Camera when a device has
// no physical camera. `initial` seeds it from GET /devices (poll) before the
// first frame.
export function useCameraStatus(liveSync: LiveSync, initial: CameraStatus = initialCameraStatus): CameraStatus {
  const [status, setStatus] = useState<CameraStatus>(initial);

  useEffect(
    () =>
      liveSync.on("camera-status", (data) =>
        setStatus((prev) => cameraStatusReducer(prev, toEvent(data as CameraStatusData))),
      ),
    [liveSync],
  );

  return status;
}
