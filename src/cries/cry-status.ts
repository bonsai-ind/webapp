export type CryState = "calm" | "fussing" | "crying";

export interface CryEpisode {
  id: string;
  babyId?: string;
  babyName: string;
  cause?: string;
  // Client receipt time of the onset frame — drives the alert's elapsed line.
  startedAt: number;
}

// Multi-baby cry state: EVERY active episode is tracked (twins can cry at
// once); `status`/`episode` are the derived single-surface view the header pill
// and the overlay render — the most recent active episode wins the takeover.
export interface CryStatus {
  status: CryState;
  episode?: CryEpisode;
  episodes: CryEpisode[];
}

export type CryStatusEvent =
  | { kind: "crying"; episodeId: string; babyId?: string; babyName: string; cause?: string; at: number }
  | { kind: "fussing" }
  // A calm clears ONLY its own episode (matched by episodeId, else babyId).
  // A bare calm with neither — a legacy frame — clears everything.
  | { kind: "calm"; episodeId?: string; babyId?: string };

export const initialCryStatus: CryStatus = { status: "calm", episodes: [] };

function derive(episodes: CryEpisode[], fussing: boolean): CryStatus {
  if (episodes.length > 0) {
    return { status: "crying", episode: episodes[episodes.length - 1], episodes };
  }
  return { status: fussing ? "fussing" : "calm", episodes };
}

// Pure state machine for the babies' audio status. Red is reserved for crying
// only (DESIGN.md) — fussing is distinct and never triggers the alert.
export function cryStatusReducer(state: CryStatus, event: CryStatusEvent): CryStatus {
  switch (event.kind) {
    case "crying": {
      const episode: CryEpisode = {
        id: event.episodeId,
        babyId: event.babyId,
        babyName: event.babyName,
        cause: event.cause,
        startedAt: event.at,
      };
      const others = state.episodes.filter((e) => e.id !== event.episodeId);
      // Re-announcement of a known episode keeps its original start time.
      const existing = state.episodes.find((e) => e.id === event.episodeId);
      return derive([...others, existing ? { ...episode, startedAt: existing.startedAt } : episode], false);
    }
    case "calm": {
      if (event.episodeId === undefined && event.babyId === undefined) {
        return derive([], false); // legacy frame — clear all
      }
      const remaining = state.episodes.filter((e) =>
        event.episodeId !== undefined ? e.id !== event.episodeId : e.babyId !== event.babyId,
      );
      return derive(remaining, false);
    }
    case "fussing":
      // Fussing never interrupts an active cry alert.
      return state.episodes.length > 0 ? state : derive([], true);
    default:
      return state; // unknown event — leave status unchanged
  }
}
