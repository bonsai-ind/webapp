export type CameraState = "available" | "unavailable" | "unknown";

export interface CameraStatus {
  state: CameraState;
}

export type CameraStatusEvent = { kind: "available" } | { kind: "unavailable" };

export const initialCameraStatus: CameraStatus = { state: "unknown" };

// Pure state machine for a device's camera presence (ADR 0010). "unavailable"
// is what surfaces the Simulate Camera affordance; "unknown" until the device
// reports (or GET /devices seeds it).
export function cameraStatusReducer(state: CameraStatus, event: CameraStatusEvent): CameraStatus {
  switch (event.kind) {
    case "available":
      return { state: "available" };
    case "unavailable":
      return { state: "unavailable" };
    default:
      return state;
  }
}
