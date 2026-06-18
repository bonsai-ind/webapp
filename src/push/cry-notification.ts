export interface CryPushPayload {
  episodeId: string;
  babyName: string;
  cause?: string;
}

export interface CryNotification {
  title: string;
  body: string;
  tag: string;
}

// Maps a cry push payload to the OS notification. `tag` is the cry-episode id so
// the browser collapses the push and any in-app alert for the same episode into
// one notification (ADR-0004 dedup). Shared by the service worker.
export function buildCryNotification(payload: CryPushPayload): CryNotification {
  return {
    title: `${payload.babyName} is crying`,
    body: payload.cause ? `Likely cause: ${payload.cause}` : "Tap to open the live monitor.",
    tag: payload.episodeId,
  };
}
