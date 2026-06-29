import type { Session } from "../session/session";
import { postJson } from "../api/get-json";
import type { FeedEntry } from "./useFeeding";

// Body of POST /babies/:id/feedings (caregiver-logged feed, ADR 0016). The server
// mints the episode id and attributes the feed to the caregiver's paired device, so
// the client sends only what the caregiver entered. volumeMl is for bottle feeds,
// durationSeconds for breast feeds.
export interface LogFeedBody {
  method: "bottle" | "breast";
  startedAt: string; // RFC3339 instant
  volumeMl?: number;
  durationSeconds?: number;
}

// Logs a feed and resolves with the created entry (the row the screen renders).
export function logFeed(session: Session, babyId: string, body: LogFeedBody): Promise<FeedEntry> {
  return postJson<FeedEntry>(session, `/babies/${babyId}/feedings`, body);
}
