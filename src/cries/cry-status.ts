export type CryState = "calm" | "fussing" | "crying";

export interface CryEpisode {
  id: string;
  babyId?: string;
  babyName: string;
  cause?: string;
}

export interface CryStatus {
  status: CryState;
  episode?: CryEpisode;
}

export type CryStatusEvent =
  | { kind: "crying"; episodeId: string; babyId?: string; babyName: string; cause?: string }
  | { kind: "fussing" }
  | { kind: "calm" };

export const initialCryStatus: CryStatus = { status: "calm" };

// Pure state machine for a baby's audio status. An active cry carries its episode
// (the alert renders from it); calm/fussing clear it. Red is reserved for crying
// only (DESIGN.md) — fussing is distinct and never triggers the alert.
export function cryStatusReducer(state: CryStatus, event: CryStatusEvent): CryStatus {
  switch (event.kind) {
    case "crying":
      return {
        status: "crying",
        episode: { id: event.episodeId, babyId: event.babyId, babyName: event.babyName, cause: event.cause },
      };
    case "fussing":
      return { status: "fussing" };
    case "calm":
      return { status: "calm" };
    default:
      return state; // unknown event — leave status unchanged
  }
}
