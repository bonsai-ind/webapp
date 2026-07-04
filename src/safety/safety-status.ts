export type SafetyState = "safe" | "alert";

// Posture mirrors the device/backend labels (firmware internal/vision/position;
// backend messages.SafetyStatus). Only face_up is safe; the rest escalate.
export type Posture = "face_up" | "face_down_or_absent" | "occluded" | "unknown";

export interface SafetyEpisode {
  id: string;
  babyId?: string;
  babyName: string;
  posture: Posture;
}

export interface SafetyStatus {
  status: SafetyState;
  episode?: SafetyEpisode;
}

export type SafetyStatusEvent =
  | { kind: "alert"; episodeId: string; babyId?: string; babyName: string; posture: Posture }
  | { kind: "clear" };

export const initialSafetyStatus: SafetyStatus = { status: "safe" };

// Pure state machine for a baby's position safety. An active prone/occlusion
// alert carries its episode (the banner renders from it); clear resets to safe.
export function safetyStatusReducer(state: SafetyStatus, event: SafetyStatusEvent): SafetyStatus {
  switch (event.kind) {
    case "alert":
      return {
        status: "alert",
        episode: { id: event.episodeId, babyId: event.babyId, babyName: event.babyName, posture: event.posture },
      };
    case "clear":
      return { status: "safe" };
    default:
      return state; // unknown event — leave status unchanged
  }
}

// postureText renders a caregiver-facing reason from a posture label.
export function postureText(posture: Posture): string {
  switch (posture) {
    case "face_down_or_absent":
      return "Face not visible — may be face-down";
    case "occluded":
      return "Baby's face may be covered";
    default:
      return "Position needs a check";
  }
}
