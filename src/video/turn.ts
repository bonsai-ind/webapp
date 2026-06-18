import type { Session } from "../session/session";
import { getJson } from "../api/get-json";

interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

// Fetch time-limited coturn credentials (GET /turn-credentials) and shape them
// into the RTCConfiguration the peer connection needs.
export async function fetchTurnConfig(session: Session): Promise<RTCConfiguration> {
  const c = await getJson<TurnCredentials>(session, "/turn-credentials");
  return { iceServers: [{ urls: c.urls, username: c.username, credential: c.credential }] };
}
